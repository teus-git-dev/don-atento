import axios from 'axios';
import * as fs from 'fs';

async function test() {
    try {
        const response = await axios.get('https://www.fincaraiz.com.co/venta/apartamentos/bogota/usado', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        fs.writeFileSync('scratch/sample_finca.html', response.data.substring(0, 50000));
        console.log('Saved 50KB to scratch/sample_finca.html');
    } catch (e) {
        console.log('Error:', e.message);
    }
}

test();
