import { Route } from '@/types';

import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import { art } from '@/utils/render';
import path from 'node:path';
import { parseDate } from '@/utils/parse-date';
import sanitizeHtml from 'sanitize-html';

export const route: Route = {
    path: '/stock_comments/:id',
    categories: ['finance'],
    example: '/xueqiu/stock_comments/SZ002626',
    parameters: { id: '股票代码（需要带上交易所）' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['xueqiu.com/S/:id'],
        },
    ],
    name: '股票评论',
    maintainers: [],
    handler,
};

async function handler(ctx) {
    const id = ctx.req.param('id');

    const res = await got({
        method: 'get',
        url: `https://xueqiu.com/query/v1/symbol/search/status?u=11111&count=100&comment=0&symbol=${id}&source=all&sort=time`,
    });

    // 获取stock_name
    const stock_name = await cache.tryGet(`stock_name_${id}`, async () => {
        const res = await got({
            method: 'get',
            url: `https://xueqiu.com/S/${id}`,
        });
        const $ = load(res.data); // 使用 cheerio 加载返回的 HTML
        return $('.stock-name').text().split('(')[0];
    });

    const data = res.data.list;
    return {
        title: `${id} ${stock_name} - 评论`,
        link: `https://xueqiu.com/S/${id}`,
        description: `${stock_name} - 评论`,
        item: data.map((item) => {
            let link = `https://xueqiu.com${item.target}`;
            if (item.quote_cards) {
                link = item.quote_cards[0].target_url;
            }
            const description = art(path.join(__dirname, 'templates/comments_description.art'), { item });
            return {
                title: item.title || sanitizeHtml(item.text, { allowedTags: [], allowedAttributes: {} }),
                description,
                pubDate: parseDate(item.created_at),
                link,
            };
        }),
    };
}
