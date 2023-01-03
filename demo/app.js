
const im = iframemanager();

/**
 * @typedef {object} WaitConfig
 * @property {'script' | 'iframe'} type,
 * @property {any} obj
 * @property {string} [prop]
 * @property {string} [selector]
 */

/**
 * Wait until a property on the window object is available
 * @param {WaitConfig} opts
 * @returns {Promise<boolean>}
 */
const waitFor = async (opts) => {
    const {obj, type, prop, selector} = opts;

    const isIframe = type === 'iframe';

    const timeout = isIframe
        ? 100
        : 10;

    const maxWait = 500;

    const objToCheck = prop
        ? obj[prop]
        : obj;

    const isDefined = () => typeof
        (isIframe
            ? obj.querySelector(selector)
            : objToCheck
        ) !== 'undefined'

    let nIntervals = 0;

    return await new Promise(resolve => {
        const interval = setInterval(() => {
            const timedOut = !isIframe && ++nIntervals * timeout > maxWait;
            if (isDefined() || timedOut) {
                clearInterval(interval);
                resolve(!timedOut);
            }
        }, timeout);
    });
};

im.run({

    /**
     * @param {{
     *  servicesState: Map<string, boolean>
     *  eventSource: 'click' | 'api'
     * }}
     */
    onChange: ({servicesState, eventSource}) => {
        if(eventSource === 'api')
            return;

        const enabledServices = [...servicesState]
            .filter(([k, v]) => v === true)
            .map(([k, v]) => k);

        console.log("www", enabledServices)

        for(const [key, value] of servicesState){
            console.log(key, value);
        }
    },

    currLang: 'en',
    // autoLang: true,

    services : {

        youtube : {
            embedUrl: 'https://www.youtube-nocookie.com/embed/{data-id}',

            iframe : {
                allow : 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen;',
            },

            languages : {
                en : {
                    notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer noopener" href="https://www.youtube.com/t/terms" target="_blank">terms and conditions</a> of youtube.com.',
                    loadBtn: 'Load video',
                    loadAllBtn: "Don't ask again"
                }
            }
        },

        dailymotion : {
            embedUrl: 'https://www.dailymotion.com/embed/video/{data-id}',

            // Use dailymotion api to obtain thumbnail
            thumbnailUrl: async (id, setThumbnail) => {
                const url = `https://api.dailymotion.com/video/${id}?fields=thumbnail_large_url`;
                const response = await (await fetch(url)).json();
                const thumbnailUrl = response?.thumbnail_large_url;
                thumbnailUrl && setThumbnail(thumbnailUrl);
            },

            iframe : {
                allow : 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen;'
            },

            languages : {
                en : {
                    notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer noopener" href="#link_dailymotion" target="_blank">terms and conditions</a> of dailymotion.com.',
                    loadBtn: 'Load video',
                    loadAllBtn: "Don't ask again"
                }
            }
        },

        twitch : {
            embedUrl: 'https://player.twitch.tv/?{data-id}&parent=localhost',

            iframe : {
                allow : 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen;',
            },

            languages : {
                en : {
                    notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer noopener" href="#link_twitch" target="_blank">terms and conditions</a> of twitch.com.',
                    loadBtn: 'Load stream',
                    loadAllBtn: "Don't ask again"
                }
            }
        },

        twitter : {

            onAccept: async (div, setIframe) => {
                const twttrLoaded = await CookieConsent.loadScript('https://platform.twitter.com/widgets.js');
                const twttrReady = twttrLoaded && await waitFor({type: 'script', obj: window, prop: 'twttr'});
                const tweet = twttrReady && await twttr.widgets.createTweet(div.dataset.id, div);
                tweet && setIframe(tweet.firstChild);
            },

            onReject: (iframe) => {
                iframe.parentNode.remove();
            },

            languages : {
                en : {
                    notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer noopener" href="https://www.youtube.com/t/terms" target="_blank">terms and conditions</a> of twitter.com.',
                    loadBtn: 'Load tweet',
                    loadAllBtn: "Don't ask again"
                }
            }
        },

        'facebook-post' : {
            embedUrl : 'https://www.facebook.com/plugins/post.php?{data-id}',

            iframe : {
                allow : 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share;',
            },

            languages : {
                en : {
                    notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer noopener" href="#link_twitch" target="_blank">terms and conditions</a> of twitch.com.',
                    loadBtn: 'Load post',
                    loadAllBtn: "Don't ask again"
                }
            }
        },

        googlemaps: {

            embedUrl: 'https://www.google.com/maps/embed?pb={data-id}',

            iframe: {
                allow : 'picture-in-picture; fullscreen;'
            },

            languages: {
                en : {
                    notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer noopener" href="https://cloud.google.com/maps-platform/terms" target="_blank">terms and conditions</a> of Google Maps.',
                    loadBtn: 'Load map',
                    loadAllBtn: "Don't ask again"
                }
            }
        },

        vimeo: {
            embedUrl: 'https://player.vimeo.com/video/{data-id}',

            iframe: {
                allow : 'fullscreen; picture-in-picture;'
            },

            thumbnailUrl: async (dataId, setThumbnail) => {
                const url = `https://vimeo.com/api/v2/video/${dataId}.json`;
                const response = await (await fetch(url)).json();
                const thumbnailUrl = response[0]?.thumbnail_large;
                thumbnailUrl && setThumbnail(thumbnailUrl);
            },

            languages: {
                en : {
                    notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer noopener" href="https://vimeo.com/terms" target="_blank">terms and conditions</a> of vimeo.com.',
                    loadBtn: 'Load video',
                    loadAllBtn: "Don't ask again"
                }
            }
        }

    }
});


const acceptAll = document.getElementById('accept-all');
const rejectAll = document.getElementById('reject-all');

acceptAll.addEventListener('click', () => {
    im.acceptService('all');
});

rejectAll.addEventListener('click', () => {
    im.rejectService('all');
});