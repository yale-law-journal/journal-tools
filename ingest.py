import argparse
import gzip
import json
import pymongo
import subprocess
import tarfile

"""
Ingest all case data from courtlistener into mongo.
"""

BULK_URL = 'https://www.courtlistener.com/api/bulk-data/clusters/all.tar'

parser = argparse.ArgumentParser(description='Ingest case data into Mongo.')
parser.add_argument('tarfile', type=str, action='store', nargs='?')
parser.add_argument('--database', type=str, action='store', default='database')
parser.add_argument('--filter', type=str, action='store')
args = parser.parse_args()

client = pymongo.MongoClient()
db = client[args.database]
collection = db.clusters
collection.drop()
assert collection.estimated_document_count() == 0

if args.tarfile:
    all_tar_path = args.tarfile
else:
    subprocess.check_call(['curl', '-o', '/tmp/all.tar', BULK_URL])
    all_tar_path = '/tmp/all.tar'

courts = args.filter.split(',')

def tar_gz_insert_all(tar_gz_obj):
    with gzip.GzipFile(fileobj=tar_gz_obj) as tar_obj:
        with tarfile.TarFile(fileobj=tar_obj) as tar:
            objects = []
            for tarinfo in tar.getmembers():
                if not tarinfo.isfile() or not tarinfo.name.endswith('.json'): continue

                with tar.extractfile(tarinfo) as json_file:
                    cluster = json.load(json_file)
                    for cite in cluster['citations']:
                        cite['reporter'] = cite['reporter'].replace('.', '').replace(' ', '').lower()
                        if cite['page'].isdigit():
                            cite['page'] = int(cite['page'])
                        else:
                            print('Error: Page is not numeric: [{}].'.format(cite['page']))
                    objects.append(cluster)

        if objects:
            collection.insert_many(objects)

with tarfile.open(all_tar_path, 'r') as all_tar:
    for tarinfo in sorted(all_tar.getmembers(), key=lambda ti: ti.name):
        if not tarinfo.isfile() or not tarinfo.name.endswith('.tar.gz'): continue

        base = tarinfo.name.replace('.tar.gz', '')
        if courts and base not in courts: continue

        print(tarinfo.name)
        with all_tar.extractfile(tarinfo) as tar_gz_file:
            tar_gz_insert_all(tar_gz_file)

print('Creating index...')
collection.create_index([
    ('citations.reporter', pymongo.ASCENDING),
    ('citations.volume', pymongo.ASCENDING),
    ('citations.page', pymongo.ASCENDING),
])
