import aiohttp
import asyncio
from concurrent.futures import ThreadPoolExecutor
from elasticsearch import Elasticsearch
import os
from os.path import dirname, isdir, isfile, join
import subprocess

executor = ThreadPoolExecutor(4)
loop = asyncio.get_event_loop()

async def try_call(*args, **kwargs):
    return await loop.run_in_executor(executor, subprocess.run, *args, **kwargs)

class CalledProcessError(Exception):
    pass

def cases_query(reporter, volume):
    return {
        'query': {
            'nested': {
                'path': 'citations',
                'score_mode': 'avg',
                'query': {
                'bool': {
                    'must': [
                        { 'term': { 'citations.reporter': reporter } },
                        { 'term': { 'citations.volume': volume } },
                    ]
                }
                }
            }
        },
        'sort': [{
            'citations.page': {
                'mode': 'avg',
                'order': 'asc',
                'nested': {
                    'path': 'citations',
                    'filter': { 'term': { 'citations.reporter': reporter } }
                }
            }
        }]
    }

async def split_volume(es_client, session, reporter, volume_file, volume_path, out_dir):
    volume = int(volume_file[:-4])
    result = es_client.search(index='cases', body=cases_query(reporter, volume), size=1000)

    coroutines = []
    cases = result['hits']['hits']
    for case, next_case in zip(cases, cases[1:] + [None]):
        start_page = case['sort'][0]
        if next_case is None:
            try:
                caselaw_url = 'https://api.case.law/v1/cases/?cite={} {} {}'.format(volume, reporter, start_page)
                async with session.get(caselaw_url) as response:
                    caselaw_result = await response.json()
                    if len(caselaw_result['results']) > 0:
                        end_page = caselaw_result['results'][0]['last_page']
                    else:
                        end_page = start_page
            except Exception as e:
                print(e)
                end_page = 'end'
        else:
            end_page = next_case['sort'][0]
            if start_page == end_page: continue
            if reporter == 'us':
                # Reporter doesn't start next case on same page.
                end_page -= 1

        if start_page == 0 or end_page == 0:
            print('page {} {} for {}'.format(start_page, end_page, volume_path))
            continue

        pages = '{}-{}'.format(start_page, end_page)
        out_path = join(out_dir, '{}.pdf'.format(start_page))
        if not isfile(out_path):
            coroutines.append(try_call(['cpdf', volume_path, pages, '-o', out_path]))

    await asyncio.gather(*coroutines)
    print('Finished', out_dir)

async def go():
    async with aiohttp.ClientSession() as session:
        es_client = Elasticsearch()

        coroutines = []
        data = join(dirname(__file__), '..', 'data')
        for reporter in os.listdir(data):
            reporter_path = join(data, reporter, 'full')
            if reporter.startswith('.') or not isdir(reporter_path): continue

            for volume in os.listdir(reporter_path):
                volume_path = join(reporter_path, volume)
                if not volume.endswith('.pdf') or not isfile(volume_path): continue

                out_path = join(data, reporter, volume[:-4])
                if not isdir(out_path):
                    os.mkdir(out_path)
                coroutines.append(split_volume(es_client, session, reporter, volume, volume_path, out_path))

        await asyncio.gather(*coroutines)

loop.run_until_complete(go())
