from base64 import b64encode
from elasticsearch_dsl import connections, Document, Integer, Text
from hashlib import sha1
import re
import scrapy

ISSUE_RE = re.compile(r'vol(?P<volume>[0-9]+)/iss(?P<issue>[0-9]+)/?$')
VOLUME_RE = re.compile(r'vol(?P<volume>[0-9]+)$')

connections.create_connection(hosts=['search-ylj-pdfapi-es-dev-zwg7cvq2vxg5qsfvwwgxx2wbzy.us-east-1.es.amazonaws.com:80'])

def normalize_title(title):
    unsub = re.sub(':.*$', '', title)
    lower = unsub.lower()
    keywords = re.sub('[^a-z0-9 ]', '', lower)
    cleaned = re.sub('note|commentary', '', keywords)
    return cleaned

class Article(Document):
    class Index:
        name = 'articles'

    title = Text()
    authors = Text()
    link = Text()
    download_link = Text()
    site_id = Integer()
    journal_name = Text()
    journal_link = Text()
    volume = Integer()
    issue = Integer()
    start_page = Text()
    key = Text()

    def save(self, *args, **kwargs):
        if self.journal_name and self.volume and self.title:
            self.key = '{}/{}/{}'.format(self.journal_name, self.volume, normalize_title(self.title))
            self.meta.id = b64encode(sha1(self.key.encode('utf-8')).digest())

        super().save(*args, **kwargs)

print('Initializing article...')
Article.init()
print('Done.')

class JournalSpider(scrapy.Spider):
    name = 'JournalSpider'
    def start_requests(self):
        return [
            scrapy.Request('https://lawreviewcommons.com/peer_review_list.html', self.journal_list)
            # scrapy.Request('https://repository.law.umich.edu/mlr/', self.journal, meta={
            #     'journal_name': 'Michigan Law Review',
            #     'journal_link': 'https://repository.law.umich.edu/mlr/',
            # })
        ]

    def journal_list(self, response):
        for link in response.xpath('//h4/a'):
            href = link.attrib['href']
            yield scrapy.Request(response.urljoin(href), self.journal, meta={
                'journal_name': link.xpath('./text()').get(),
                'journal_link': href,
            })

    def journal(self, response):
        print('Journal:', response.url)
        for option in response.xpath('//form[@id="browse"]//option'):
            link = option.attrib['value']
            issue_match = ISSUE_RE.search(link)
            if issue_match:
                volume = int(issue_match.group('volume'))
                issue = int(issue_match.group('issue'))
                yield scrapy.Request(response.urljoin(link), self.issue, meta=dict(response.meta, **{
                    'volume': volume,
                    'issue': issue,
                }))
            else:
                volume_match = VOLUME_RE.search(link)
                if volume_match:
                    volume = int(volume_match.group('volume'))
                    yield scrapy.Request(response.urljoin(link), self.volume, meta=dict(response.meta, **{
                        'volume': volume,
                    }))

    def volume(self, response):
        for href in response.xpath('//div[@id="toc"]//a/@href'):
            match = ISSUE_RE.search(href.get())
            if match:
                issue = int(match.group('issue'))
                yield scrapy.Request(response.urljoin(href.get()), self.issue, meta=dict(response.meta, **{
                    'issue': issue,
                }))

    def issue(self, response):
        for article in response.xpath('//div[@class="doc"]'):
            item = Article(
                journal_name=response.meta['journal_name'],
                journal_link=response.meta['journal_link'],
                volume=response.meta['volume'],
                issue=response.meta['issue']
            )
            for link in article.xpath('.//a'):
                href = link.attrib['href']
                if href.startswith(response.url):
                    item.title = link.xpath('./text()').get()
                    item.link = href

                site_id = link.re_first(r'article=([0-9]+)')
                if site_id is not None:
                    item.site_id = site_id
                    item.download_link = href

            for authors in article.xpath('.//span[@class="auth"]/text()'):
                item.authors = authors.get()

            for pageno in article.xpath('.//span[@class="pageno"]/text()'):
                item.start_page = pageno.get()

            item.save()

    def article(self, response):
        for citation in response.xpath('string(//div[@id="recommended_citation" or @id="custom_citation"][1])'):
            self.logger.info('Citation: %s', citation.get())
