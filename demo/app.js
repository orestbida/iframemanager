const im = iframemanager();
const MAPS_API_KEY = ''

im.run({

    onChange: ({changedServices, eventSource}) => {
        console.log(changedServices, eventSource)
    },

    currLang: 'en',
    // autoLang: true,

    services : {

        youtube : {
            category: 'analytics',
            embedUrl: 'https://www.youtube-nocookie.com/embed/{data-id}',

            iframe : {
                allow : 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen;',
            },

            languages : {
                en : {
                    notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer noopener" href="https://www.youtube.com/t/terms" target="_blank">terms and conditions</a> of youtube.com.',
                    loadBtn: 'Load once',
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
                    loadBtn: 'Load once',
                    loadAllBtn: "Don't ask again"
                }
            }
        },

        twitch : {
            embedUrl: `https://player.twitch.tv/?{data-id}&parent=${location.hostname}`,

            iframe : {
                allow : 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen;',
            },

            languages : {
                en : {
                    notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer noopener" href="#link_twitch" target="_blank">terms and conditions</a> of twitch.com.',
                    loadBtn: 'Load once',
                    loadAllBtn: "Don't ask again"
                }
            }
        },

        leaflet: {
            /**
             *
             * @param {HTMLDivElement} div
             */
            onAccept: async (div) => {
                const leafletLoaded = await CookieConsent.loadScript('https://unpkg.com/leaflet@1.9.3/dist/leaflet.js');
                const leafletReady = leafletLoaded && await im.childExists({childProperty: 'L'});

                if(!leafletReady)
                    return;

                const mapCoordinates = JSON.parse(div.dataset.mapCoordinates);
                const markerCoordinates = (div.dataset.mapMarkers || '').split(';')
                const map = L.map(div.lastElementChild.firstElementChild).setView(mapCoordinates, 13);
                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

                for(const coordinates of markerCoordinates)
                    coordinates && L.marker(JSON.parse(coordinates)).addTo(map);

                div.classList.add('c-h-b');
            },

            onReject: (a) => {
                console.log("must remove:", a);
            },

            languages : {
                en : {
                    notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer noopener" href="#link_twitch" target="_blank">terms and conditions</a> of twitch.com.',
                    loadBtn: 'Load once',
                    loadAllBtn: "Don't ask again"
                }
            }
        },

        twitter : {

            onAccept: async (div, setIframe) => {
                await CookieConsent.loadScript('https://platform.twitter.com/widgets.js');
                await im.childExists({childProperty: 'twttr'});
                const tweet = await twttr.widgets.createTweet(div.dataset.id, div.firstElementChild);
                tweet && setIframe(tweet.firstChild);
            },

            /**
             * @param {HTMLIFrameElement} iframe
             */
            onReject: (iframe) => {
                iframe && iframe.parentElement.remove();
            },

            languages : {
                en : {
                    notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer noopener" href="https://www.youtube.com/t/terms" target="_blank">terms and conditions</a> of twitter.com.',
                    loadBtn: 'Load once',
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
                    loadBtn: 'Load once',
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
                    loadBtn: 'Load once',
                    loadAllBtn: "Don't ask again"
                }
            }
        },

        googlemapsapi: {

            iframe: {
                onload : function(dataId, setThumbnail){
                    console.log("loaded iframe with data-id=", dataId, setThumbnail);
                }
            },

            onAccept: async (div, setIframe) => {

                await CookieConsent.loadScript(`https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}`);
                await im.childExists({childProperty: 'google'});

                // The location of Uluru
                const uluru = {
                    lat: parseInt(div.dataset.mapsLat),
                    lng: parseInt(div.dataset.mapsLng)
                };

                // The map, centered at Uluru
                const map = new google.maps.Map(div.querySelector('.map'), {
                    zoom: 4,
                    center: uluru
                });

                if(div.dataset.mapsMarker === ''){
                    // The marker, positioned at Uluru
                    const marker = new google.maps.Marker({
                        position: uluru,
                        map: map,
                    });
                }

                if(div.dataset.mapsStreetview === ''){
                    const panorama = new google.maps.StreetViewPanorama(div.querySelector('.map'), {
                            position: uluru,
                            pov: {
                                heading: 34,
                                pitch: 10,
                            },
                        }
                    );

                    map.setStreetView(panorama);
                }

                await im.childExists({parent: div});
                setIframe(div.querySelector('iframe'));
            },

            onReject: (iframe) => {
                // console.log("must remove:", iframe);
            },

            languages : {
                en : {
                    notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer noopener" href="https://www.youtube.com/t/terms" target="_blank">terms and conditions</a> of twitter.com.',
                    loadBtn: 'Load once',
                    loadAllBtn: "Don't ask again"
                }
            }
        },

        instagram: {
            onAccept: async (div, setIframe) => {
                await CookieConsent.loadScript('https://www.instagram.com/embed.js');
                await im.childExists({childProperty: 'instgrm'});
                instgrm.Embeds.process();
                await im.childExists({parent: div});
                setIframe(div.querySelector('iframe'));
            },

            onReject: (iframe) => {
                // console.log("remove iframe:", iframe);
            },

            languages: {
                en : {
                    notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer noopener" href="https://vimeo.com/terms" target="_blank">terms and conditions</a> of vimeo.com.',
                    loadBtn: 'Load once',
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
                    loadBtn: 'Load once',
                    loadAllBtn: "Don't ask again"
                }
            }
        }

    }
});


const acceptAll = document.getElementById('accept-all');
const rejectAll = document.getElementById('reject-all');

acceptAll.addEventListener('click', () => im.acceptService('all'));
rejectAll.addEventListener('click', () => im.rejectService('all'));