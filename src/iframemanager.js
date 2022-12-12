/*!
 * iframemanager v1.1.0
 * Author Orest Bida
 * Released under the MIT License
 */
(() => {
    'use strict';

    /**
     * @typedef {Object} IframeObj
     * @property {string} _id
     * @property {string} _title
     * @property {string} _thumbnail
     * @property {string} _params
     * @property {boolean} _thumbnailPreload
     * @property {boolean} _autoscale
     * @property {HTMLDivElement} _div
     * @property {HTMLIFrameElement} _iframe
     * @property {HTMLDivElement} _backgroundDiv
     * @property {boolean} _hasIframe
     * @property {boolean} _hasNotice
     * @property {boolean} _showNotice
     * @property {Object.<string, string>} _iframeAttributes
     */

    /**
     * @typedef {HTMLIFrameElement} IframeProp
     */

    /**
     * @typedef {Object} CookieStructure
     * @property {string} name
     * @property {string} path
     * @property {string} domain
     * @property {string} sameSite
     * @property {number} expiration
     */

    /**
     * @typedef {Object} Language
     * @property {string} notice
     * @property {string} loadBtn
     * @property {string} loadAllBtn
     */

    /**
     * @typedef {Object} Service
     * @property {string} embedUrl
     * @property {IframeProp} [iframe]
     * @property {CookieStructure} cookie
     * @property {Object.<string, Language>} languages
     * @property {Function} [onAccept]
     * @property {Function} [onReject]
     */

    let

        /**
         * @type {Object.<string, IframeObj[]>}
         */
        iframeDivs = {},

        /**
         * @type {string[]}
         */
        preconnects = [],

        /**
         * @type {string[]}
         */
        preloads = [],

        stopObserver = false,
        currLang = '',

        /**
         * @type {Object.<string, Service>}
         */
        services = {},

        /**
         * @type {string[]}
         */
        serviceNames = [],

        /**
         * @type {Document}
         */
        doc = {};

    /**
     * Prevent direct use of the following
     * props. in the `iframe` element to avoid
     * potential issues
     */
    const disallowedProps = ['onload', 'onerror', 'src'];

    const isFunction = el => typeof el === 'function';
    const isString = el => typeof el === 'string';
    const getBrowserLang = () => navigator.language.slice(0, 2).toLowerCase();

    /**
     * @returns {string[]}
     */
    const getKeys = obj => obj && Object.keys(obj) || [];

    /**
     * @param {HTMLDivElement} div
     * @returns {IframeObj}
     */
    const getVideoProp = (div) => {

        const dataset = div.dataset;
        const iframeAttrs = {};
        const iframeAttrSelector = 'data-iframe-';

        const iframeAttrNames = div.getAttributeNames()
            .filter(attr => attr.slice(0, 12) === iframeAttrSelector)
            .map(attr => attr.slice(12));

        /**
         * Get all "data-iframe-* attributes
         */
        for(const attrName of iframeAttrNames)
            iframeAttrs[attrName] = div.getAttribute(iframeAttrSelector + attrName);

        return {
            _id: dataset.id,
            _title: dataset.title,
            _thumbnail: dataset.thumbnail,
            _params: dataset.params,
            _thumbnailPreload: 'thumbnailpreload' in dataset,
            _autoscale: 'autoscale' in dataset,
            _div: div,
            _backgroundDiv: null,
            _hasIframe: false,
            _hasNotice: false,
            _showNotice : true,
            _iframeAttributes: iframeAttrs
        };
    };

    /**
     * Lazy load all thumbnails of the iframes relative to specified service
     * @param {string} serviceName
     * @param {string} thumbnailUrl
     */
    const lazyLoadThumnails = (serviceName, thumbnailUrl) => {

        const videos = iframeDivs[serviceName];

        if ("IntersectionObserver" in window) {
            const thumbnailObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if(entry.isIntersecting){
                        // true index of the video in the array relative to current service
                        loadThumbnail(thumbnailUrl, videos[entry.target.dataset.index]);
                        thumbnailObserver.unobserve(entry.target);
                    }
                });
            });

            for(const video of videos) {
                thumbnailObserver.observe(video._div);
            }
        }
    };


    /**
     * Set image as background
     * @param {string} url
     * @param {IframeObj} video
     */
    const loadThumbnail = (url, video) => {

        const loadBackgroundImage = (src) => {
            video._backgroundDiv.style.backgroundImage = `url('${src}')`;

            const img = new Image();

            img.onload = function() {
                video._backgroundDiv.classList.add('loaded');
            };

            img.src = src;
        }

        // Set custom thumbnail if provided
        if(isString(video._thumbnail)){
            video._thumbnailPreload && preloadThumbnail(video._thumbnail);
            video._thumbnail !== '' && loadBackgroundImage(video._thumbnail);
        }else{

            if(isFunction(url)){

                url(video._id, (src) => {
                    preconnect(src);
                    video._thumbnailPreload && preloadThumbnail(src);
                    loadBackgroundImage(src);
                });

            }else if(isString(url)){
                const src = url.replace('{data-id}', video._id);
                preconnect(src);
                video._thumbnailPreload && preloadThumbnail(src);
                loadBackgroundImage(src);
            }
        }

    };

    /**
     * Create iframe and append it into the specified div
     * @param {IframeObj} video
     * @param {Service} service
     */
    const createIframe = (video, service) => {

        // Create iframe only if doesn't alredy have one
        if(video._hasIframe)
            return;

        video._hasIframe = true;

        if(isFunction(service.onAccept)){

            // Let the onAccept method create the iframe
            service.onAccept(video._div, (iframe) => {
                video._iframe = iframe;
                video._hasIframe = true;
                video._div.classList.add('c-h-b');
            });

            return;
        }

        video._iframe = createNode('iframe');

        const iframeParams = video._params || (service.iframe && service.iframe.params);

        // Replace data-id with valid resource id
        const embedUrl = service.embedUrl || '';
        let src = embedUrl.replace('{data-id}', video._id);

        video._title && (video._iframe.title = video._title);

        // Add parameters to src
        if(iframeParams){
            if (iframeParams.substring(0, 3) === 'ap:'){
                src += iframeParams.substring(3);
            }else{
                src += '?' + iframeParams;
            }
        }

        const iframeProps = service.iframe;

        // When iframe is loaded => hide background image
        video._iframe.onload = function() {
            video._div.classList.add('c-h-b');
            video._iframe.onload = undefined;

            iframeProps
            && isFunction(iframeProps.onload)
            && iframeProps.onload(video._id, video._iframe);
        };

        /**
         * Add global internal attributes
         */
        for(const key in iframeProps){
            setAttribute(video._iframe, key, iframeProps[key])
        }

        /**
         * Add all data-attr-* attributes (iframe specific)
         */
        for(const attr in video._iframeAttributes){
            setAttribute(video._iframe, attr, video._iframeAttributes[attr])
        }

        video._iframe.src = src;

        appendChild(video._div, video._iframe);
    };

    /**
     * @param {HTMLElement} el
     * @param {string} attrKey
     * @param {string} attrValue
     */
    const setAttribute = (el, attrKey, attrValue) => {
        if(!disallowedProps.includes(attrKey))
            el.setAttribute(attrKey, attrValue);
    }

    /**
     * Remove iframe HTMLElement from div
     * @param {IframeObj} video
     */
    const removeIframe = (video) => {
        video._iframe.parentNode.removeChild(video._iframe);
        video._hasIframe = false;
    };

    /**
     * Remove necessary classes to hide notice
     * @param {IframeObj} video
     */
    const hideNotice = (video) => {
        video._div.classList.add('c-h-n');
        video._showNotice = false;
    };

    /**
     * Add necessary classes to show notice
     * @param {IframeObj} video
     */
    const showNotice = (video) => {
        video._div.classList.remove('c-h-n', 'c-h-b');
        video._showNotice = true;
    };

    /**
     * Get cookie by name
     * @param {string} a cookie name
     * @returns {string} cookie value
     */
    const getCookie = (a) => {
        return (a = doc.cookie.match(`(^|;)\\s*${a}\\s*=\\s*([^;]+)`))
            ? a.pop()
            : '';
    };

    /**
     * Set cookie based on given object
     * @param {CookieStructure} cookie
     */
    const setCookie = (cookie) => {

        const { hostname, protocol } = location;
        const name = cookie.name;
        const value = '1';
        const date = new Date();
        const path = cookie.path || '/';
        const expiration = (cookie.expiration || 182) * 86400000;
        const sameSite = cookie.sameSite || 'Lax';
        const domain = cookie.domain || hostname;

        date.setTime(date.getTime() + expiration);

        let cookieStr = name + '='
            + value
            + (expiration !== 0 ? `; Expires=${date.toUTCString()}` : '')
            + `; Path=${path}`
            + `; SameSite=${sameSite}`;

        // assures cookie works with localhost (=> don't specify domain if on localhost)
        if(domain.indexOf('.') > -1)
            cookieStr += `; Domain=${domain}`;

        if(protocol === 'https:')
            cookieStr += '; Secure';

        doc.cookie = cookieStr;
    };

    /**
     * Delete cookie by name & path
     * @param {CookieStructure} cookie
     */
    const eraseCookie = (cookie) => {
        const name = cookie.name;
        const path = cookie.path || '/';
        const domain = cookie.domain || location.hostname;
        const expires = 'Thu, 01 Jan 1970 00:00:01 GMT';

        doc.cookie = `${name}=; Path=${path}; Domain=${domain}; Expires=${expires};`;
    };

    /**
     * Add link rel="preconnect"
     * @param {string} _url
     */
    const preconnect = (_url) => {
        const url = _url.split('://');
        const protocol = url[0];

        // if valid protocol
        if(
            protocol === 'http' ||
            protocol === 'https'
        ){
            const domain = url[1] && url[1].split('/')[0];

            // if not current domain
            if(domain && domain !== location.hostname){
                if(preconnects.indexOf(domain) === -1){
                    const link = createNode('link');
                    link.rel = 'preconnect';
                    link.href = `${protocol}://${domain}`;
                    appendChild(doc.head, link);
                    preconnects.push(domain);
                }
            }
        }
    };

    /**
     * Add link rel="preload"
     * @param {string} url
     */
    const preloadThumbnail = (url) => {
        if(url && preloads.indexOf(url) === -1){
            const link = createNode('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = url;
            appendChild(doc.head, link);
            preloads.push(url);
        }
    }

    /**
     * Create and return HTMLElement based on specified type
     * @param {string} type
     */
    const createNode = (type) => doc.createElement(type);

    /**
     * @returns {HTMLDivElement}
     */
    const createDiv = () => createNode('div');

    /**
     * @returns {HTMLButtonElement}
     */
    const createButton = () => {
        const btn = createNode('button');
        btn.type = 'button';
        return btn;
    }

    /**
     * @param {HTMLElement} el
     * @param {string} className
     */
    const setClassName = (el, className) => el.className = className;

    /**
     * @param {HTMLElement} parent
     * @param {HTMLElement} child
     */
    const appendChild = (parent, child) => parent.appendChild(child);

    /**
     * Create all notices relative to the specified service
     * @param {string} serviceName
     * @param {Service} service
     * @param {boolean} hidden
     */
    const createAllNotices = (serviceName, service, hidden) => {

        // get number of iframes of current service
        const videos = iframeDivs[serviceName];
        const languages = service.languages;

        videos.forEach(video => {


            if(!video._hasNotice){
                const loadBtnText = languages[currLang].loadBtn;
                const noticeText = languages[currLang].notice;
                const loadAllBtnText = languages[currLang].loadAllBtn;

                const fragment = doc.createDocumentFragment();
                const notice = createDiv();
                const span = createDiv();
                const innerDiv = createDiv();
                const buttons = createDiv();

                const showVideo = () => {
                    hideNotice(video);
                    createIframe(video, service);
                };

                if(loadBtnText){
                    const load_button = createButton();
                    load_button.textContent = loadBtnText;
                    setClassName(load_button, 'c-l-b');

                    load_button.addEventListener('click', showVideo);
                    appendChild(buttons, load_button)
                }

                if(loadAllBtnText){
                    const load_all_button = createButton()
                    load_all_button.textContent = loadAllBtnText;
                    setClassName(load_all_button, 'c-la-b');

                    load_all_button.addEventListener('click', () => {
                        showVideo();
                        api.acceptService(serviceName);
                    });

                    appendChild(buttons, load_all_button);
                }

                const notice_text = createDiv();
                const ytVideoBackground = createDiv();
                const loaderBg = createDiv();
                const ytVideoBackgroundInner = createDiv();
                const notice_text_container = createDiv();

                setClassName(notice_text, 'cc-text');
                setClassName(ytVideoBackgroundInner, 'c-bg-i');

                video._backgroundDiv = ytVideoBackgroundInner;
                setClassName(loaderBg, 'c-ld');

                if(!isString(video._thumbnail) || video._thumbnail !== ''){
                    setClassName(ytVideoBackground, 'c-bg');
                }

                const iframeTitle = video._title;
                const fragment_2 = doc.createDocumentFragment();

                if(iframeTitle) {
                    const title_span = createNode('span');
                    setClassName(title_span, 'c-tl');
                    title_span.insertAdjacentHTML('beforeend', iframeTitle);
                    appendChild(fragment_2, title_span);
                }

                appendChild(notice_text, fragment_2);
                notice && notice_text.insertAdjacentHTML('beforeend', noticeText || "");
                appendChild(span, notice_text);

                setClassName(notice_text_container, 'c-t-cn');
                setClassName(span, 'c-n-t');
                setClassName(innerDiv, 'c-n-c');
                setClassName(notice, 'c-nt');
                setClassName(buttons,  'c-n-a');


                appendChild(notice_text_container, span);
                appendChild(notice_text_container, buttons);

                appendChild(innerDiv, notice_text_container);
                appendChild(notice, innerDiv);

                appendChild(ytVideoBackground, ytVideoBackgroundInner);
                appendChild(fragment, notice);
                (service.thumbnailUrl || video._thumbnail) && appendChild(fragment, ytVideoBackground);
                appendChild(fragment, loaderBg);

                hidden && video._div.classList.add('c-h-n');

                // Avoid reflow with fragment (only 1 appendChild)
                appendChild(video._div, fragment);
                video._hasNotice = true;
            }
        });
    };

    /**
     * Hides all notices relative to the specified service
     * and creates iframe with the video
     * @param {string} serviceName
     * @param {Service} service
     */
    const hideAllNotices = (serviceName, service) => {

        // get number of iframes of current service
        const videos = iframeDivs[serviceName];

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                if(stopObserver){
                    observer.disconnect();
                    return;
                }
                for(let i=0; i<entries.length; ++i){
                    if(entries[i].isIntersecting){
                        ((i) => {
                            /**
                             * @type {HTMLDivElement}
                             */
                            const target = entries[i].target;
                            setTimeout(() => {
                                const dataIndex = target.dataset.index;
                                createIframe(videos[dataIndex], service);
                                hideNotice(videos[dataIndex]);
                            }, i*50);
                            observer.unobserve(target);
                        })(i);
                    }
                }
            });

            videos.forEach((video) => {
                if(!video._hasIframe)
                    observer.observe(video._div);
            });
        }
    };


    /**
     * Show all notices relative to the specified service
     * and hides iframe with the video
     * @param {string} serviceName
     * @param {Service} service
     */
    const showAllNotices = (serviceName, service) => {

        // get number of iframes of current service
        const videos = iframeDivs[serviceName];

        for(let i=0; i<videos.length; i++){
            ((i) => {
                // if doesn't have iframe => create it
                if(videos[i]._hasIframe){
                    if(isFunction(service.onReject)){
                        service.onReject(videos[i]._iframe);
                        videos[i]._hasIframe = false;
                    }else{
                        removeIframe(videos[i]);
                    }
                }
                showNotice(videos[i]);
            })(i);
        }
    };

    /**
     * Validate language (make sure it exists)
     * @param {string} lang
     * @param {Object} allLanguages
     * @returns {string} language
     */
    const getValidatedLanguage = (lang, allLanguages) => {
        if(lang in allLanguages){
            return lang;
        }else if(getKeys(allLanguages).length > 0){
            if(currLang in allLanguages){
                return currLang ;
            }else{
                return getKeys(allLanguages)[0];
            }
        }
    };

    /**
     * @param {string} serviceName
     * @param {Service} service
     */
    const acceptHelper = (serviceName, service) => {
        const { cookie } = service;

        if(!getCookie(cookie.name))
            setCookie(cookie);

        hideAllNotices(serviceName, service);
    };

    /**
     * @param {string} serviceName
     * @param {Service} service
     */
    const rejectHelper = (serviceName, service) => {
        const { cookie } = service;

        if(getCookie(cookie.name))
            eraseCookie(cookie);

        showAllNotices(serviceName, service);
    };

    const api = {

        /**
         * 1. Set cookie (if not alredy set)
         * 2. show iframes (relative to the specified service)
         * @param {string} serviceName
         */
        acceptService : (serviceName) => {
            stopObserver = false;

            if(serviceName === 'all'){

                for(const name of serviceNames)
                    acceptHelper(name, services[name]);

            }else if(serviceNames.includes(serviceName)){
                acceptHelper(serviceName, services[serviceName]);
            }
        },

        /**
         * 1. set cookie
         * 2. hide all notices
         * 3. how iframes (relative to the specified service)
         * @param {string} serviceName
         */
        rejectService : (serviceName) => {

            if(serviceName === 'all'){
                stopObserver = true;

                for(const name of serviceNames)
                    rejectHelper(name, services[name]);

            }else if(serviceNames.includes(serviceName)){
                rejectHelper(serviceName, services[serviceName]);
            }
        },

        run : (_config) => {

            doc = document;
            /**
             * Object with all services config.
             */
            services = _config.services;

            /**
             * Array containing the names of all services
             */
            serviceNames = getKeys(services);

            if(serviceNames.length === 0)
                return;

            // Set curr lang
            currLang = _config.currLang;
            const languages = services[serviceNames[0]].languages;

            if(_config.autoLang === true){
                currLang = getValidatedLanguage(getBrowserLang(), languages);
            }else if(isString(_config.currLang)){
                currLang = getValidatedLanguage(_config.currLang, languages);
            }

            // for each service
            for(const serviceName of serviceNames){

                // add new empty array of videos (with current service name as property)
                iframeDivs[serviceName] = [];

                /**
                 * iframes/divs in the dom that have data-service value as current service name
                 */
                /**
                 * @type {NodeListOf<HTMLDivElement>}
                 */
                const foundDivs = doc.querySelectorAll(`div[data-service="${serviceName}"]`);


                /**
                 * number of iframes with current service
                 */
                const nDivs = foundDivs.length;

                // if no iframes found => go to next service
                if(nDivs === 0){
                    continue;
                }

                // add each iframe to array of iframes of the current service
                for(let j=0; j<nDivs; j++){
                    foundDivs[j].dataset.index = j;
                    iframeDivs[serviceName].push(getVideoProp(foundDivs[j]));
                }

                const currService = services[serviceName];

                /**
                 * Use service's name as cookie name,
                 * if no cookie.name is specified
                 */
                const { cookie } = currService;
                !cookie && (currService.cookie = {});
                const cookieObj = currService.cookie;

                const cookieName = cookieObj.name || `im_${serviceName}`;
                cookieObj.name = cookieName;

                const cookieExists = getCookie(cookieName);

                // if cookie is not set => show notice
                if(cookieExists){
                    createAllNotices(serviceName, currService, true);
                    hideAllNotices(serviceName, currService);
                }else{
                    createAllNotices(serviceName, currService, false);
                }

                lazyLoadThumnails(serviceName, currService.thumbnailUrl);
            }
        }
    };

    const fnName = 'iframemanager';

    if(typeof window !== 'undefined' && !isFunction(window[fnName])){
        window[fnName] = () => api;
    }

})();