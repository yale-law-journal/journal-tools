from elasticsearch import Elasticsearch
from elasticsearch_dsl import connections, Document, Integer, Search, Text
import re
import scrapy

ISSUE_RE = re.compile(r'vol(?P<volume>[0-9]+)/iss(?P<issue>[0-9]+)$')

connections.create_connection(hosts=['localhost'])

class Article(Document):
    class Index:
        name = 'article'

    title = Text()
    authors = Text()
    link = Text()
    site_id = Integer()
    # journal_name = scrapy.Field()
    journal_link = Text()
    volume = Integer()
    issue = Integer()
    start_page = Integer()

Article.init()
Article.search().query().delete()

class JournalSpider(scrapy.Spider):
    name = 'JournalSpider'
    def start_requests(self):
        return [
            scrapy.Request('https://lawreviewcommons.com/peer_review_list.html', self.journal_list)
        ]

    def journal_list(self, response):
        for href in response.xpath('//a[.="Visit Journal"]/@href'):
            yield scrapy.Request(response.urljoin(href.get()), self.journal, meta={
                'journal_link': href.get(),
            })

    def journal(self, response):
        for option in response.xpath('//form[@id="browse"]//option'):
            link = option.attrib['value']
            match = ISSUE_RE.search(link)
            if match:
                volume = int(match.group('volume'))
                issue = int(match.group('issue'))
                yield scrapy.Request(response.urljoin(link), self.issue, meta={
                    'journal_link': response.meta['journal_link'],
                    'volume': volume,
                    'issue': issue,
                })

    def issue(self, response):
        self.logger.info('Issue: %d %d', response.meta['issue'], response.meta['volume'])
        for article in response.xpath('//div[@class="doc"]'):
            item = Article(
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

            for authors in article.xpath('.//span[@class="auth"]/text()'):
                item.authors = authors.get()

            for pageno in article.xpath('.//span[@class="pageno"]/text()'):
                item.start_page = pageno.get()

            item.save()

    def article(self, response):
        for citation in response.xpath('string(//div[@id="recommended_citation" or @id="custom_citation"][1])'):
            self.logger.info('Citation: %s', citation.get())
