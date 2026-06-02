import {GEO_SCHEMA} from '../src/config/geoSchema.js';

async function run() {
    for (let schema of GEO_SCHEMA) {
        try {
            const url = `https://public.geo.lu.ch/ogd/services/managed/${schema.product_id}/MapServer/WFSServer?service=wfs&version=2.0.0&request=getfeature&typename=${schema.layer}&count=1&outputformat=geojson`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                console.log('--- ' + schema.title + ' ---');
                console.log(Object.keys(data.features[0].properties).join(', '));
            } else {
                console.log('--- ' + schema.title + ' (NO DATA) ---');
            }
        } catch (e) {
            console.log('Error for', schema.title, e.message);
        }
    }
}

run();
