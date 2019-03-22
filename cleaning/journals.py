import re
import scrapy

ISSUE_RE = re.compile(r'vol(?P<volume>[0-9]+)/iss(?P<issue>[0-9]+)$')

class JournalSpider(scrapy.Spider):
    name = 'JournalSpider'
    start_urls = ['https://lawreviewcommons.com/peer_review_list.html']

    def parse(self, response):
        for link in response.xpath('//a[.="Visit Journal"]'):
            yield scrapy.Request(response.urljoin(link.attrib['href']), self.journal)

    def journal(self, response):
        for option in response.xpath('//form[@id="browse"]//option'):
            link = option.attrib['value']
            match = ISSUE_RE.search(link)
            if match:
                issue = int(match.group('issue'))
                volume = int(match.group('volume'))
                request = scrapy.Request(response.urljoin(link), self.issue)
                request.meta['issue'] = issue
                request.meta['volume'] = volume
                yield request

    def issue(self, response):
        self.logger.info('Issue: %d %d', response.meta['issue'], response.meta['volume'])
        for href in response.xpath('//div[@class="doc"]//a/@href'):
            if href.get().startswith(response.url):
                yield scrapy.Request(response.urljoin(href.get()), self.article)

    def article(self, response):
        for citation in response.xpath('string(//div[@id="recommended_citation" or @id="custom_citation"][1])'):
            self.logger.info('Citation: %s', citation.get())
