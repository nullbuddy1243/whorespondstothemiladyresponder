import * as dotenv from 'dotenv'
import needle from 'needle';
import * as util from 'util'
dotenv.config();

const tapikey=process.env.tapikey;
const tapisec = process.env.tapisec;
const tbeartok=process.env.tbeartok;
const tappname=process.env.tappname;


const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';
const streamURL = 'https://api.twitter.com/2/tweets/search/stream';

async function setRules(rules) {
    const data = {
        "add": rules
    }

    const resp = await needle('post', rulesURL, data, {
        headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${tbeartok}`
        }
    });

    if (resp.statusCode !== 201) {
        console.log(`err in set rules`)
        console.log(resp.statusCode)
        console.log(resp.statusMessage)
        console.log(util.inspect(resp.body, false, 5, true ))

        throw new Error(resp.body);
    }

    return resp.body;
}

async function getRules() {
    const resp = await needle('get', rulesURL, {
        headers: {
            authorization: `Bearer ${tbeartok}`
        }
    })

    if (resp.statusCode !== 200) {
        throw new Error(resp.body);
    }

    return resp.body;
}


function connectStream(retries) {

    const stream = needle.get(streamURL, {
        headers: {
            "User-Agent": "v2FilterStreamJS",
            "Authorization": `Bearer ${tbeartok}`
        },
        timeout: 20000
    });

    stream.on('data', data => {
        try {
            const json = JSON.parse(data);
            console.log(json);
            // A successful connection resets retry count.
            retries = 0;
        } catch (e) {
            if (data.detail === "This stream is currently at the maximum allowed connection limit.") {
                console.log(data.detail)
                process.exit(1)
            } else {
                // Keep alive signal received. Do nothing.
            }
        }
    }).on('err', error => {
        if (error.code !== 'ECONNRESET') {
            console.log(error.code);
            process.exit(1);
        } else {
            // This reconnection logic will attempt to reconnect when a disconnection is detected.
            // To avoid rate limits, this logic implements exponential backoff, so the wait time
            // will increase if the client cannot reconnect to the stream. 
            setTimeout(() => {
                console.warn("A connection error occurred. Reconnecting...")
                streamConnect(++retries);
            }, 2 ** retries)
        }
    });

    return stream;

}

(async () => {

    const rules = [
        {
            value: 'milady from:MiIadyResponder',
            
        }
    ]

    let rulesNow;

    try {

        console.log(`starting ${tappname}`);

        rulesNow = await getRules();

        console.log(`rules at start: `, rulesNow);

        await setRules(rules)

        rulesNow = await getRules();

        console.log(`rules set to: `, rulesNow);
    }
    catch (e) {
        console.log(e);
        process.exit(1);
    }

    console.log('connecting to stream:')
    connectStream(0);

})();