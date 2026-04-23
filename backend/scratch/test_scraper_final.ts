import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
    try {
        const url = 'https://www.fincaraiz.com.co/venta/apartamentos/bogota/usado?ad-type=1';
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const leads: any[] = [];

        $('.listingCard').each((i, el) => {
            const title = $(el).find('.lc-title').text().trim();
            const price = $(el).find('.main-price').text().trim();
            if (title && price) {
                leads.push({ title, price });
            }
        });

        console.log('Found leads:', leads.length);
        if (leads.length > 0) {
            console.log('Sample:', leads[0]);
        }
    } catch (e: any) {
        console.log('Error:', e.message);
    }
}

test();
