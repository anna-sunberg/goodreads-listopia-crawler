const request = require('request-promise');
const $ = require('cheerio');
const { each, slice } = require('lodash');

const GOODREADS_URL = 'https://www.goodreads.com';
const LISTS_URI = '/list/book';
const SEARCH_URI = '/search?q=';

const findLists = async ({ bookId, searchString }) => {
  const results = [];
  let cur = 1;
  let max = 1;

  let html = await request(encodeURI(`${GOODREADS_URL}${LISTS_URI}/${bookId}?page=${cur}`));

  const nextPage = $('a.next_page', html);
  if (nextPage.length) {
    max = parseInt(nextPage.prev()[0].children[0].data);
  }

  while (cur <= max) {
    const listTitles = $('a.listTitle', html);
    each(listTitles, ((listTitle) => {
      const title = listTitle.children[0].data;
      if (title.toLowerCase().indexOf(searchString.toLowerCase()) > -1) {
        console.log(title);
        results.push({
          title,
          url: `${GOODREADS_URL}${listTitle.attribs.href}`
        });
      }
    }));
    cur++;
    console.log(`Fetching ${GOODREADS_URL}${LISTS_URI}/${bookId}?page=${cur}`);
    html = await request(`${GOODREADS_URL}${LISTS_URI}/${bookId}?page=${cur}`);
  }
  console.log(results);
};

const findBookIds = async ({ allPages = false, searchString }) => {
  const results = [];
  const total = allPages ? Infinity : 5;
  let cur = 1;
  let max = 1;

  let html = await request(encodeURI(`${GOODREADS_URL}${SEARCH_URI}${searchString.replace(/ /g, '+')}`));

  let nextPage = $('a.next_page', html);
  if (nextPage.length) {
    max = parseInt(nextPage.prev()[0].children[0].data);
  }

  while (cur <= max) {
    const table = $('table.tableList', html);
    each($('tr', table), (row) => {
      const bookName = $('.bookTitle', row).text();
      const uri = $('.bookTitle', row)[0].attribs.href;
      const authorName = $('.authorName', row).text();
      const rating = $('.minirating', row).text().replace('really liked it ', '');
      results.push({ bookName, authorName, rating, bookURL: `${GOODREADS_URL}${uri}` });
    });
    cur++;
    if (allPages && nextPage.length) {
      console.log(`Fetching ${GOODREADS_URL}${nextPage[0].attribs.href}`);
      html = await request(`${GOODREADS_URL}${nextPage[0].attribs.href}`);
      nextPage = $('a.next_page', html);
    }
  }
  slice(results, 0, total).map(({ bookName, authorName, rating, bookURL }) => {
    console.log(`${bookName} by ${authorName}; ${rating}; ${bookURL}`);
  });
}

(async () => {
  require('yargs')
    .command({
      command: 'list',
      aliases: ['list'],
      description: 'find lists containing string',
      builder: (yargs) => (
        yargs.option('id', {
          alias: 'bookId',
          type: 'string',
          description: 'Book id on goodreads'
        })
        .option('search', {
          alias: 'searchString',
          type: 'string',
          description: 'String to search for'
        })
      ),
      handler: findLists
    })
    .command({
      command: 'find',
      aliases: ['find'],
      description: 'find book ids',
      builder: (yargs) => (
        yargs.option('search', {
          alias: 'searchString',
          type: 'string',
          description: 'search term'
        })
        .option('allpages', {
          alias: 'all',
          type: 'boolean',
          description: 'Search all pages of results'
        })
      ),
      handler: findBookIds
    })
    .help().argv;
})();
