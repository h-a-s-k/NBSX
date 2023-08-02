/**
 * PASTE YOUR AUTHORIZATION BETWEEN THE QUOTES
 * @preserve
 */
const Authorization = '';

/**
## EXPERIMENTAL

### SettingName: (DEFAULT)/opt1/opt2

 1. `PromptExperiment`: (true)/false
    * true is an alternative way to send your prompt to the AI
    * experiment before setting to false

 2. `RenewAlways`: (false)/true
    * true creates a new conversation, sending all messages each time
    * false sends only latest assistant->user messages
    * experiment before setting to true

 3. `SystemExperiments`: (true)/false
    * only has effect when RenewAlways is set to false
    * no effect on very first message
    * true sends the last system prompt (typically your jailbreak) followed by assistant->user messages
       * on hitting `SystemInterval` messages, sends all system prompts followed by assistant->user messages
    * false sends all system prompts with every message

 * @preserve 
 */
const Settings = {
    PromptExperiment: true,
    RenewAlways: false,
    SystemExperiments: true
};

const Ip = '127.0.0.1';
const Port = 8555;

/**
 * Only has effect when PromptExperiment is true
 * Sent together with the file
 * New: what to send when starting a new conversation
 * Continue: what to send on each following reply

 * @preserve 
 */
const Orders = {
    New: 'Comply.',
    Continue: 'Continue.'
};

/**
 * How many characters will be buffered before the AI types once
 * @default 8

 * @preserve 
 */
const BufferSize = 8;

/**
 * Only has effect when SystemExperiments is true
 * Interval between each time all system prompts are included
 * @default 3

 * @preserve 
 */
const SystemInterval = 3;

const {createServer: Server, ServerResponse} = require('node:http');
const {createHash: Hash, randomUUID, randomInt, randomBytes} = require('node:crypto');
const {TransformStream} = require('node:stream/web');
const {Writable} = require('node:stream');

const Decoder = new TextDecoder;
const Encoder = new TextEncoder;

const Roles = {
    user: 'User: ',
    assistant: 'Assistant: ',
    system: '',
    example_assistant: 'Assistant: ',
    example_user: 'User: '
};

const Assistant = '\n\n' + Roles.assistant;
const User = '\n\n' + Roles.user;
const DangerChars = [ ...new Set([ ...Assistant, ...'\n\nHuman: ', ...User, ...'\\n' ]) ].filter((e => ' ' !== e)).sort();

const cookies = {};
const Conversation = {
    uuid: null,
    depth: 0
};

let prevMessages;
let mdlCache;

ServerResponse.prototype.json = async function(e, t = 200, o) {
    e = e instanceof Promise ? await e : e;
    this.headersSent || this.writeHead(t, {
        'Content-Type': 'application/json',
        ...o && o
    });
    this.end('object' == typeof e ? JSON.stringify(e) : e);
    return this;
};

Array.prototype.sample = function() {
    return this[Math.floor(Math.random() * this.length)];
};

const AI = {
    end: () => Buffer.from([ 104, 116, 116, 112, 115, 58, 47, 47, 99, 104, 97, 116, 46, 110, 98, 111, 120, 46, 97, 105 ]),
    mdl: () => Buffer.from([ 47, 97, 112, 105, 47, 109, 111, 100, 101, 108, 115 ]).toString(),
    conv: () => Buffer.from([ 47, 97, 112, 105, 47, 99, 111, 110, 118, 101, 114, 115, 97, 116, 105, 111, 110, 115 ]).toString(),
    prompt: () => Buffer.from([ 47, 97, 112, 105, 47, 112, 114, 111, 109, 112, 116 ]).toString(),
    new: e => Buffer.from([ 47, 97, 112, 105, 47, 110, 101, 119, 63, 99, 111, 110, 118, 101, 114, 115, 97, 116, 105, 111, 110, 95, 105, 100, 61 ]).toString() + e,
    cfg: () => Buffer.from([ 47, 97, 112, 105, 47, 109, 111, 100, 105, 102, 121, 67, 111, 110, 102, 105, 103 ]).toString(),
    del: () => Buffer.from([ 47, 97, 112, 105, 47, 100, 101, 108, 101, 116, 101, 67, 111, 110, 118, 101, 114, 115, 97, 116, 105, 111, 110 ]).toString(),
    censor: () => Buffer.from([ 84, 104, 105, 115, 32, 99, 111, 110, 116, 101, 110, 116, 32, 104, 97, 115, 32, 98, 101, 101, 110, 32, 102, 108, 97, 103, 103, 101, 100, 32, 97, 115, 32, 105, 110, 97, 112, 112, 114, 111, 112, 114, 105, 97, 116, 101, 46, 32, 80, 108, 101, 97, 115, 101, 32, 116, 114, 121, 32, 97, 110, 111, 116, 104, 101, 114, 32, 113, 117, 101, 114, 121, 32, 111, 114, 32, 116, 114, 121, 32, 115, 119, 105, 116, 99, 104, 105, 110, 103, 32, 116, 111, 32, 97, 32, 111, 112, 101, 110, 115, 111, 117, 114, 99, 101, 32, 109, 111, 100, 101, 108 ]).toString(),
    agent: () => JSON.parse(Buffer.from([ 91, 34, 77, 111, 122, 105, 108, 108, 97, 47, 53, 46, 48, 32, 40, 87, 105, 110, 100, 111, 119, 115, 32, 78, 84, 32, 49, 48, 46, 48, 59, 32, 87, 105, 110, 54, 52, 59, 32, 120, 54, 52, 41, 32, 65, 112, 112, 108, 101, 87, 101, 98, 75, 105, 116, 47, 53, 51, 55, 46, 51, 54, 32, 40, 75, 72, 84, 77, 76, 44, 32, 108, 105, 107, 101, 32, 71, 101, 99, 107, 111, 41, 32, 67, 104, 114, 111, 109, 101, 47, 49, 49, 53, 46, 48, 46, 48, 46, 48, 32, 83, 97, 102, 97, 114, 105, 47, 53, 51, 55, 46, 51, 54, 32, 69, 100, 103, 47, 49, 49, 53, 46, 48, 46, 49, 57, 48, 49, 46, 49, 56, 56, 34, 44, 34, 77, 111, 122, 105, 108, 108, 97, 47, 53, 46, 48, 32, 40, 87, 105, 110, 100, 111, 119, 115, 32, 78, 84, 32, 49, 48, 46, 48, 59, 32, 87, 105, 110, 54, 52, 59, 32, 120, 54, 52, 41, 32, 65, 112, 112, 108, 101, 87, 101, 98, 75, 105, 116, 47, 53, 51, 55, 46, 51, 54, 32, 40, 75, 72, 84, 77, 76, 44, 32, 108, 105, 107, 101, 32, 71, 101, 99, 107, 111, 41, 32, 67, 104, 114, 111, 109, 101, 47, 49, 49, 53, 46, 48, 46, 48, 46, 48, 32, 83, 97, 102, 97, 114, 105, 47, 53, 51, 55, 46, 51, 54, 34, 44, 34, 77, 111, 122, 105, 108, 108, 97, 47, 53, 46, 48, 32, 40, 87, 105, 110, 100, 111, 119, 115, 32, 78, 84, 32, 49, 48, 46, 48, 59, 32, 87, 105, 110, 54, 52, 59, 32, 120, 54, 52, 59, 32, 114, 118, 58, 49, 48, 57, 46, 48, 41, 32, 71, 101, 99, 107, 111, 47, 50, 48, 49, 48, 48, 49, 48, 49, 32, 70, 105, 114, 101, 102, 111, 120, 47, 49, 49, 54, 46, 48, 34, 44, 34, 77, 111, 122, 105, 108, 108, 97, 47, 53, 46, 48, 32, 40, 87, 105, 110, 100, 111, 119, 115, 32, 78, 84, 32, 49, 48, 46, 48, 59, 32, 87, 105, 110, 54, 52, 59, 32, 120, 54, 52, 41, 32, 65, 112, 112, 108, 101, 87, 101, 98, 75, 105, 116, 47, 53, 51, 55, 46, 51, 54, 32, 40, 75, 72, 84, 77, 76, 44, 32, 108, 105, 107, 101, 32, 71, 101, 99, 107, 111, 41, 32, 67, 104, 114, 111, 109, 101, 47, 49, 49, 53, 46, 48, 46, 48, 46, 48, 32, 83, 97, 102, 97, 114, 105, 47, 53, 51, 55, 46, 51, 54, 32, 79, 80, 82, 47, 49, 48, 50, 46, 48, 46, 48, 46, 48, 34, 93 ]).toString()).sample(),
    hdr: () => ({
        Referer: AI.end() + '/',
        Origin: '' + AI.end(),
        'User-Agent': AI.agent()
    })
};

const fileName = () => {
    const e = randomInt(5, 15);
    let t = randomBytes(e).toString('hex');
    for (let e = 0; e < t.length; e++) {
        const o = t.charAt(e);
        isNaN(o) && randomInt(1, 5) % 2 == 0 && ' ' !== t.charAt(e - 1) && (t = t.slice(0, e) + ' ' + t.slice(e));
    }
    return t + '.txt';
};

const deleteChat = async e => {
    if (!e) {
        return;
    }
    const t = await fetch(`${AI.end()}${AI.del()}`, {
        headers: {
            ...AI.hdr(),
            Cookie: getCookies(),
            Authorization,
            'Content-Type': 'application/json'
        },
        method: 'PUT',
        body: JSON.stringify({
            conversation_id: e
        })
    });
    const o = await t.json();
    if (!t?.body || !o?.success) {
        return null;
    }
    updateCookies(t);
    return e;
};

const bytesToSize = (e = 0) => {
    const t = [ 'B', 'KB', 'MB', 'GB', 'TB' ];
    if (0 === e) {
        return '0 B';
    }
    const o = Math.min(Math.floor(Math.log(e) / Math.log(1024)), 4);
    return 0 === o ? `${e} ${t[o]}` : `${(e / 1024 ** o).toFixed(1)} ${t[o]}`;
};

const genericFixes = e => e.replace(/(\r\n|\r|\\n)/gm, '\n');

const updateCookies = e => {
    let t = e instanceof Response ? e.headers?.get('set-cookie') : e.split('\n').join('');
    if (!t) {
        return;
    }
    let o = t.split(/;\s?/gi).filter((e => false === /^(path|expires|domain|HttpOnly|Secure|SameSite)[=;]*/i.test(e)));
    for (const e of o) {
        const t = e.split(/^(.*?)=\s*(.*)/);
        const o = t[1];
        const s = t[2];
        cookies[o] = s;
    }
};

const getCookies = () => Object.keys(cookies).map((e => `${e}=${cookies[e]};`)).join(' ').replace(/(\s+)$/gi, '');

const setTitle = e => {
    e = 'NBSX v1.0 - ' + e;
    process.title !== e && (process.title = e);
};

const getModels = async () => {
    const e = await fetch(`${AI.end()}${AI.mdl()}`, {
        method: 'GET',
        headers: {
            ...AI.hdr(),
            Cookie: getCookies(),
            Authorization
        }
    });
    const t = await e.json();
    if (!e?.body || !t?.success) {
        throw Error('Couldn\'t get models list');
    }
    updateCookies(e);
    const o = {
        data: t.models.filter((e => e.is_running)).map((e => ({
            id: e.name,
            config: e.config,
            idx: e.id
        })))
    };
    mdlCache = o;
    return o;
};

const messageToPrompt = e => {
    if (e.name && !(e.name in Roles) || !(e.role in Roles)) {
        throw Error('Invalid role: ' + (e.name || e.role));
    }
    return `${Roles[e.name || e.role]}${genericFixes(e.content)}`;
};

class NBSXStream extends TransformStream {
    constructor(e = 8, t, o) {
        super({
            transform: (e, t) => {
                this.#e(e, t);
            },
            flush: e => {
                this.#t(e);
            }
        });
        this.#o = e;
        this.#s = t;
        this.#n = o;
    }
    #o=void 0;
    #s=false;
    #r='';
    #i='';
    #n=void 0;
    #a=false;
    #c=[];
    #l=[];
    #h=[];
    #m=0;
    get size() {
        return this.#m;
    }
    get valid() {
        return this.#c.length;
    }
    get invalid() {
        return this.#l.length;
    }
    get total() {
        return this.#h.length;
    }
    get broken() {
        return Math.min(this.invalid / this.total * 100, 100).toFixed(2) + '%';
    }
    get censored() {
        return true === this.#a;
    }
    empty() {
        this.#h = this.#l = this.#c = [];
        this.#r = this.#i = '';
    }
    #t(e) {
        this.#i.length > 0 && e.enqueue(this.#u(this.#i));
        prevMessages.push({
            content: this.#h.join(''),
            role: 'assistant'
        });
    }
    #d() {
        const e = [ ...this.#i ];
        const t = e.splice(0, this.#o).join('');
        this.#i = e.join('');
        return t;
    }
    #u(e) {
        const t = {
            choices: [ {
                delta: {
                    content: genericFixes(e)
                }
            } ]
        };
        return Encoder.encode(`data: ${JSON.stringify(t)}\n\n`);
    }
    #f() {}
    #e(e, t) {
        this.#m += e.length || 0;
        const o = Decoder.decode(e);
        if (!o || o.length < 1) {
            return;
        }
        this.#r += o;
        let s;
        let n;
        try {
            s = JSON.parse(this.#r.replace(/(\n){5}/gm, ''));
            s.value === AI.censor() && (this.#a = true);
            this.#c.push(s.value);
        } catch (e) {
            const t = this.#r.match(/(?<="value":")([\s\S]*?)(?=\\?")/gi);
            if (t?.length > 0) {
                s = {
                    value: t.join('')
                };
                this.#l.push(s.value);
            }
        } finally {
            if (s?.value) {
                this.#i += s.value;
                this.#r = '';
                this.#h.push(s.value);
                n = DangerChars.some((e => this.#i.endsWith(e) || s.value.startsWith(e)));
            }
        }
        n && this.#f();
        for (;!n && this.#i.length >= this.#o; ) {
            const e = this.#d();
            t.enqueue(this.#u(e));
        }
    }
}

const Proxy = Server((async (e, t) => {
    switch (e.url) {
      case '/v1/models':
        return t.json(getModels());

      case '/v1/chat/completions':
        return ((e, t) => {
            setTitle('recv...');
            let o;
            const s = new AbortController;
            const {signal: n} = s;
            t.socket.on('close', (async () => {
                s.signal.aborted || s.abort();
            }));
            const r = [];
            e.on('data', (e => {
                r.push(e);
            }));
            e.on('end', (async () => {
                let e;
                let i;
                try {
                    const a = JSON.parse(Buffer.concat(r).toString());
                    const c = mdlCache.data.find((e => e.id === a.model));
                    const {messages: l} = a;
                    if (!l?.length > 0) {
                        throw Error('Select OpenAI as completion source');
                    }
                    if (!a.stream && 1 === l?.length && JSON.stringify(l?.sort() || []) === JSON.stringify([ {
                        role: 'user',
                        content: 'Hi'
                    } ].sort())) {
                        return t.json({
                            error: false
                        });
                    }
                    if (!c || isNaN(c.idx)) {
                        throw Error('Enable \'Show External models\' and pick one');
                    }
                    if (!a.stream) {
                        throw Error('Enable streaming');
                    }
                    (async (e, t, o) => {
                        const s = await fetch(`${AI.end()}${AI.cfg()}`, {
                            headers: {
                                ...AI.hdr(),
                                Authorization,
                                Cookie: getCookies(),
                                'Content-Type': 'application/json'
                            },
                            method: 'POST',
                            body: JSON.stringify({
                                model: e.idx,
                                system: '',
                                penalty: o,
                                temperature: t
                            })
                        });
                        updateCookies(s);
                        const n = await s.json();
                        if (!s?.body || !n?.success) {
                            throw Error('Couldn\'t set model params');
                        }
                    })(c, a.temperature, a.presence_penalty);
                    let h = l.map(messageToPrompt).join('\n\n');
                    const m = l.findLast((e => 'assistant' === e.role));
                    const u = l.findLast((e => 'user' === e.role));
                    let d = JSON.stringify(l) === JSON.stringify(prevMessages);
                    const f = l.find((e => 'assistant' === e.role))?.content !== prevMessages?.find((e => 'assistant' === e.role))?.content;
                    const p = u?.content !== prevMessages?.findLast((e => 'user' === e.role))?.content;
                    d && !p || (prevMessages = l);
                    const g = Settings.RenewAlways || f || !Settings.RenewAlways && d;
                    console.log('' + c.id);
                    if (g && Conversation.uuid) {
                        await deleteChat(Conversation.uuid);
                        Conversation.uuid = null;
                        Conversation.depth = 0;
                    }
                    if (Conversation.uuid) {
                        if (!d) {
                            const e = !Settings.RenewAlways && Settings.SystemExperiments;
                            const t = !e || e && Conversation.depth >= SystemInterval;
                            const o = [ ...new Set(l.filter((e => '[Start a new chat]' !== e.content)).filter((e => !e.name && 'system' === e.role))) ];
                            let s;
                            if (t) {
                                console.log('system-full');
                                s = [ ...o, m, u ];
                                Conversation.depth = 0;
                            }
                            if (!t && e) {
                                console.log('system-jailbreak');
                                s = [ m, u, o[o.length - 1] ];
                            }
                            h = s.map(messageToPrompt).join('\n\n');
                            Conversation.depth++;
                        }
                    } else {
                        Conversation.uuid = randomUUID().toString();
                        o = await fetch(`${AI.end()}${AI.new(Conversation.uuid)}`, {
                            signal: n,
                            method: 'GET',
                            headers: {
                                ...AI.hdr(),
                                Cookie: getCookies(),
                                Authorization
                            }
                        });
                        const e = await o.json();
                        if (!o?.body || !e?.success) {
                            throw Error('Couldn\'t initialize reply');
                        }
                        updateCookies(o);
                    }
                    o = await fetch(`${AI.end()}${AI.prompt()}`, {
                        signal: n,
                        headers: {
                            ...AI.hdr(),
                            Authorization,
                            Cookie: getCookies(),
                            'Content-Type': 'text/plain;charset=UTF-8'
                        },
                        method: 'POST',
                        body: JSON.stringify({
                            attachement: Settings.PromptExperiment ? h : '',
                            attachment_name: Settings.PromptExperiment ? fileName() : '',
                            browseWeb: false,
                            conversation_id: Conversation.uuid,
                            model_id: c.idx,
                            query: Settings.PromptExperiment ? g ? Orders.New : Orders.Continue : h
                        })
                    });
                    updateCookies(o);
                    const C = Writable.toWeb(t);
                    if (200 !== o.status) {
                        return o.body.pipeTo(C);
                    }
                    e = new NBSXStream(BufferSize, true === a.stream, s);
                    i = setInterval((() => setTitle(`recv${true === a.stream ? ' (s)' : ''} ${bytesToSize(e.size)}`)), 300);
                    await o.body.pipeThrough(e).pipeTo(C);
                    e.censored && console.log('[33mfilter detected[0m');
                    console.log(`${200 == o.status ? '[32m' : '[33m'}${o.status}![0m${g ? ' [r]' : ''}${true === a.stream ? ' (s)' : ''} ${e.broken} broken\n`);
                    e.empty();
                } catch (e) {
                    if ('AbortError' === e.name) {
                        return t.end();
                    }
                    console.error('NBSX error:\n%o', e);
                    t.json({
                        error: {
                            message: 'NBSX: ' + (e.message || e.name),
                            type: e.type || e.code || e.name,
                            param: null,
                            code: 500
                        }
                    });
                } finally {
                    clearInterval(i);
                    i = null;
                    setTitle('ok ' + bytesToSize(e.size));
                }
            }));
        })(e, t);

      default:
        return t.json({
            error: {
                message: '404 Not Found',
                type: 404,
                param: null,
                code: 404
            }
        }, 404);
    }
}));

Proxy.listen(Port, Ip, (async () => {
    const e = await fetch(`${AI.end()}${AI.conv()}`, {
        method: 'GET',
        headers: {
            ...AI.hdr(),
            Authorization
        }
    });
    const t = await e.json();
    if (!e?.body || !t?.success) {
        throw Error('Couldn\'t get account info, have you set the Authorization?');
    }
    updateCookies(e);
    setTitle('ok');
    await getModels();
    console.log(`[2mNBSX v1.0[0m\n[33mhttp://${Ip}:${Port}/v1[0m\n\n${Object.keys(Settings).map((e => `[1m${e}:[0m [36m${Settings[e]}[0m`)).sort().join('\n')}\n`);
    await Promise.all(t.conversations.map((e => deleteChat(e.conversation_id))));
    console.log('Logged in %o', mdlCache.data.map((e => e.id)).sort());
}));

Proxy.on('error', (e => {
    console.error('Proxy error\n%o', e);
}));

process.on('SIGINT', (async e => {
    try {
        await deleteChat(Conversation.uuid);
    } catch (e) {}
    process.exit(0);
}));

process.on('exit', (async e => {
    try {
        await deleteChat(Conversation.uuid);
    } catch (e) {}
}));