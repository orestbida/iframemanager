/*!
 * iframemanager v1.2.1
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
     * @property {HTMLDivElement} _div
     * @property {HTMLDivElement} _innerContainer
     * @property {HTMLDivElement} _placeholderDiv
     * @property {HTMLDivElement} _initialPlaceholderClone
     * @property {HTMLIFrameElement} _iframe
     * @property {HTMLDivElement} _backgroundDiv
     * @property {boolean} _hasIframe
     * @property {boolean} _hasNotice
     * @property {boolean} _showNotice
     * @property {boolean} _dataWidget
     * @property {boolean} _dataPlaceholderVisible
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

    const API_EVENT_SOURCE = 'api';
    const CLICK_EVENT_SOURCE = 'click';
    const DATA_ID_PLACEHOLDER = '{data-id}';
    const ACCEPT_ACTION = 'accept';
    const REJECT_ACTION = 'reject';

    const HIDE_NOTICE_CLASS = 'c-h-n';
    const HIDE_LOADER_CLASS = 'c-h-b';
    const SHOW_PLACEHOLDER_CLASS = 'show-ph';

    let

        /**
         * @type {Window}
         */
        win,

        /**
         * @type {Document}
         */
        doc,

        config,

        /**
         * @type {Object.<string, IframeObj[]>}
         */
        iframeDivs = {},

        stopObserver = false,
        currLang = '',

        /**
         * @type {Object.<string, Service>}
         */
        services = {},

        /**
         * @type {string[]}
         */
        serviceNames,

        /**
         * @type {Map<string, boolean>}
         */
        servicesState = new Map(),

        /**
         * @type {'api' | 'click'}
         */
        currentEventSource = API_EVENT_SOURCE,

        onChangeCallback;

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
     * @param {HTMLElement} el
     * @param {string} className
     * @returns
     */
    const addClass = (el, className) => el.classList.add(className);

    /**
     * @param {HTMLElement} parent
     * @param {HTMLElement} child
     */
    const appendChild = (parent, child) => parent.appendChild(child);

    /**
     * @returns {string[]}
     */
    const getKeys = obj => obj && Object.keys(obj) || [];

    /**
     * @param {HTMLIFrameElement} iframe
     * @param {Object.<string, string>} attrs
     */
    const setIframeAttributes = (iframe, attrs) => {
        for(const key in attrs)
            setAttribute(iframe, key, attrs[key])
    }

    /**
     * @param {HTMLDivElement} div
     * @returns {IframeObj}
     */
    const getDivProps = (div) => {

        const dataset = div.dataset;
        const iframeAttrs = {};
        const iframeAttrSelector = 'data-iframe-';

        const iframeAttrNames = div.getAttributeNames()
            .filter(attr => attr.slice(0, 12) === iframeAttrSelector)
            .map(attr => attr.slice(12));

        const placeholderDiv = div.querySelector('[data-placeholder]');
        const dataVisible = placeholderDiv?.hasAttribute('data-visible');
        dataVisible && placeholderDiv.removeAttribute('data-visible');
        const placeholderClone = placeholderDiv?.cloneNode(true);

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
            _div: div,
            _innerContainer: null,
            _placeholderDiv: placeholderDiv,
            _initialPlaceholderClone: placeholderClone,
            _backgroundDiv: null,
            _hasIframe: false,
            _hasNotice: false,
            _showNotice: true,
            _dataWidget: 'widget' in dataset,
            _dataPlaceholderVisible: dataVisible,
            _iframeAttributes: iframeAttrs
        };
    };

    /**
     * @param {string} serviceName
     * @param {string} thumbnailUrl
     */
    const lazyLoadThumbnails = (serviceName, thumbnailUrl) => {

        const videos = iframeDivs[serviceName];

        if ('IntersectionObserver' in win) {
            const thumbnailObserver = new IntersectionObserver((entries) => {
                for(const entry of entries){
                    if(entry.isIntersecting){
                        // true index of the video in the array relative to current service
                        loadThumbnail(thumbnailUrl, videos[entry.target.dataset.index]);
                        thumbnailObserver.unobserve(entry.target);
                    }
                }
            });

            for(const video of videos)
                thumbnailObserver.observe(video._div);
        }
    };


    /**
     * @param {string} url
     * @param {IframeObj} video
     */
    const loadThumbnail = (url, video) => {

        const loadBackgroundImage = (src) => {
            video._backgroundDiv.style.backgroundImage = `url('${src}')`;

            const img = new Image();
            img.onload = () => addClass(video._backgroundDiv, 'loaded');
            img.src = src;
        }

        // Set custom thumbnail if provided
        if(isString(video._thumbnail)){
            video._thumbnail !== '' && loadBackgroundImage(video._thumbnail);
        }else{

            if(isFunction(url)){
                url(video._id, (src) => loadBackgroundImage(src));

            }else if(isString(url)){
                const src = url.replace(DATA_ID_PLACEHOLDER, video._id);
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

        // Create iframe only if doesn't already have one
        if(video._hasIframe)
            return;

        video._hasIframe = true;

        if(video._placeholderDiv){
            const newFreshPlaceholder = video._initialPlaceholderClone.cloneNode(true);
            video._placeholderDiv.replaceWith(newFreshPlaceholder);
            video._placeholderDiv = newFreshPlaceholder;
        }

        const iframeProps = service.iframe;

        if(isFunction(service.onAccept)){

            // Let the onAccept method create the iframe
            service.onAccept(video._div, (iframe) => {

                if(!(iframe instanceof HTMLIFrameElement))
                    return false;

                /**
                 * Add global internal attributes
                 */
                setIframeAttributes(iframe, iframeProps);

                /**
                 * Add all data-attr-* attributes (iframe specific)
                 */
                setIframeAttributes(iframe, video._iframeAttributes);

                video._iframe = iframe;
                video._hasIframe = true;

                // Hide loading circle
                addClass(video._div, HIDE_LOADER_CLASS);

                // Show placeholder
                (!video._dataPlaceholderVisible || video._dataWidget)
                    && addClass(video._div, SHOW_PLACEHOLDER_CLASS);
            });

            return;
        }

        video._iframe = createNode('iframe');

        /**
         * @type {string}
         */
        const iframeParams = video._params || service?.iframe?.params;

        // Replace data-id with valid resource id
        const embedUrl = service.embedUrl || '';
        let src = embedUrl.replace(DATA_ID_PLACEHOLDER, video._id);

        video._title && (video._iframe.title = video._title);

        // Add parameters to src
        if(iframeParams && isString(iframeParams)){
            src += iframeParams.slice(0, 1) === '?'
                ? iframeParams
                : `?${iframeParams}`
        }

        // When iframe is loaded => hide background image
        video._iframe.onload = () => {
            addClass(video._div, HIDE_LOADER_CLASS);
            video._iframe.onload = undefined;

            isFunction(iframeProps?.onload)
                && iframeProps.onload(video._id, video._iframe);
        };

        /**
         * Add global internal attributes
         */
        setIframeAttributes(video._iframe, iframeProps);

        /**
         * Add all data-attr-* attributes (iframe specific)
         */
        setIframeAttributes(video._iframe, video._iframeAttributes);

        video._iframe.src = src;

        appendChild(video._innerContainer, video._iframe);
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
     * Add necessary classes to hide notice
     * @param {IframeObj} video
     */
    const hideNotice = (video) => {
        addClass(video._div, HIDE_NOTICE_CLASS);
        video._showNotice = false;
    };

    /**
     * Add necessary classes to show notice
     * @param {IframeObj} video
     */
    const showNotice = (video) => {
        video._div.classList.remove(
            HIDE_NOTICE_CLASS,
            HIDE_LOADER_CLASS,
            SHOW_PLACEHOLDER_CLASS
        );
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

            if(!video._hasNotice && languages){
                const loadBtnText = languages[currLang]?.loadBtn;
                const noticeText = languages[currLang]?.notice;
                const loadAllBtnText = languages[currLang]?.loadAllBtn;

                const fragment = doc.createElement('div');
                const notice = createDiv();
                const span = createDiv();
                const innerDiv = createDiv();
                const buttons = createDiv();

                setClassName(fragment, 'cll');
                video._innerContainer = fragment;

                const showVideo = () => {
                    hideNotice(video);
                    createIframe(video, service);
                };

                if(loadBtnText){
                    const load_button = createButton();
                    load_button.textContent = loadBtnText;
                    setClassName(load_button, 'c-l-b');

                    load_button.addEventListener(CLICK_EVENT_SOURCE, showVideo);
                    appendChild(buttons, load_button)
                }

                if(loadAllBtnText){
                    const load_all_button = createButton()
                    load_all_button.textContent = loadAllBtnText;
                    setClassName(load_all_button, loadBtnText ? 'c-la-b' : 'c-l-b');

                    load_all_button.addEventListener(CLICK_EVENT_SOURCE, () => {
                        showVideo();

                        currentEventSource = CLICK_EVENT_SOURCE;
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

                if(loadBtnText || loadAllBtnText)
                    appendChild(notice_text_container, buttons);

                appendChild(innerDiv, notice_text_container);
                appendChild(notice, innerDiv);

                appendChild(ytVideoBackground, ytVideoBackgroundInner);
                appendChild(fragment, notice);
                (service.thumbnailUrl || video._thumbnail) && appendChild(fragment, ytVideoBackground);
                appendChild(fragment, loaderBg);

                hidden && addClass(video._div, HIDE_NOTICE_CLASS);

                // Avoid reflow with fragment (only 1 appendChild)
                video._div.prepend(fragment);
                video._hasNotice = true;

                setTimeout(()=> addClass(video._div, 'c-an'), 20);
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

        if ('IntersectionObserver' in win) {
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
                        service.onReject(videos[i]._iframe || videos[i]._div);
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

    /**
     * @param {string} serviceName
     * @param {'accept' | 'reject'} action
     * @param {string[]} changedServices
     */
    const fireOnChangeCallback = (serviceName, action, changedServices) => {
        isFunction(onChangeCallback) && onChangeCallback({
            eventSource: {
                type: currentEventSource,
                service: serviceName,
                action
            },
            changedServices
        });
    }

    const api = {

        /**
         * @param {string} serviceName
         */
        acceptService: (serviceName) => {
            stopObserver = false;
            const changedServices = [];

            if(serviceName === 'all'){
                let changed = false;

                for(const name of serviceNames){
                    if(!servicesState.get(name)){
                        servicesState.set(name, true);
                        acceptHelper(name, services[name]);
                        changedServices.push(name);
                    }
                }

                changedServices.length > 0 && fireOnChangeCallback(serviceName, ACCEPT_ACTION, changedServices);

            }else if(serviceNames.includes(serviceName)){
                if(!servicesState.get(serviceName)){
                    servicesState.set(serviceName, true);
                    acceptHelper(serviceName, services[serviceName]);
                    changedServices.push(serviceName);
                    fireOnChangeCallback(serviceName, ACCEPT_ACTION, changedServices);
                }
            }

            currentEventSource = API_EVENT_SOURCE;
        },

        /**
         * @param {string} serviceName
         */
        rejectService: (serviceName) => {

            const changedServices = [];

            if(serviceName === 'all'){
                stopObserver = true;

                for(const name of serviceNames){
                    rejectHelper(name, services[name]);

                    if(servicesState.get(name)){
                        servicesState.set(name, false);
                        changedServices.push(name);
                    }
                }

                changedServices.length > 0 && fireOnChangeCallback(serviceName, REJECT_ACTION, changedServices);

            }else if(serviceNames.includes(serviceName)){

                rejectHelper(serviceName, services[serviceName]);

                if(servicesState.get(serviceName)){
                    servicesState.set(serviceName, false);
                    changedServices.push(serviceName);

                    fireOnChangeCallback(serviceName, REJECT_ACTION, changedServices);
                }
            }
        },

        /**
         * Check if a property/element is defined,
         * if it's not then check again; repeat until maxTimeout reached.
         *
         * Useful when trying to use API from external scripts,
         * or when you need to make sure a dom element exists
         * (e.g. dynamically generated iframe).
         *
         * @param {object} config
         * @param {any} [config.parent]
         * @param {string} [config.childProperty]
         * @param {string} [config.childSelector]
         * @param {number} [config.timeout]
         * @param {number} [config.maxTimeout]
         * @returns {Promise<boolean>}
         */
        childExists: async ({parent=win, childProperty, childSelector='iframe', timeout=1000, maxTimeout=15000}) => {

            let nTimeouts = 1;

            const child = childProperty
                ? () => parent[childProperty]
                : () => parent.querySelector(childSelector);

            return new Promise(resolve => {
                const checkChild = () => {
                    if (child() || nTimeouts++ * timeout > maxTimeout)
                        return resolve(child() !== undefined);
                    else
                        setTimeout(checkChild, timeout);
                };

                checkChild();
            });
        },

        getState: () => ({
            services: new Map(servicesState),
            acceptedServices: [...servicesState]
                .filter(([name, value]) => !!value)
                .map(([name]) => name)
        }),

        getConfig: () => config,

        run: (_config) => {

            doc = document;
            win = window;
            config = _config;

            /**
             * Object with all services config.
             */
            services = config.services;

            onChangeCallback = config.onChange;

            /**
             * Array containing the names of all services
             */
            serviceNames = getKeys(services);

            if(serviceNames.length === 0)
                return;

            // Set curr lang
            currLang = config.currLang;
            const languages = services[serviceNames[0]].languages;

            if(config.autoLang === true){
                currLang = getValidatedLanguage(getBrowserLang(), languages);
            }else if(isString(config.currLang)){
                currLang = getValidatedLanguage(config.currLang, languages);
            }

            // for each service
            for(const serviceName of serviceNames){

                const currService = services[serviceName];

                /**
                 * Use service's name as cookie name,
                 * if no cookie.name is specified
                 */
                const cookieObj = (currService.cookie ||= {});
                const cookieName = (cookieObj.name ||= `im_${serviceName}`);

                const cookieExists = getCookie(cookieName);
                servicesState.set(serviceName, !!cookieExists);

                // add new empty array of videos (with current service name as property)
                iframeDivs[serviceName] = [];

                /**
                 * @type {NodeListOf<HTMLDivElement>}
                 */
                const foundDivs = doc.querySelectorAll(`div[data-service="${serviceName}"]`);

                const nDivs = foundDivs.length;

                // if no iframes found => go to next service
                if(nDivs === 0){
                    continue;
                }

                // add each iframe to array of iframes of the current service
                for(let j=0; j<nDivs; j++){
                    foundDivs[j].dataset.index = j;
                    iframeDivs[serviceName].push(getDivProps(foundDivs[j]));
                }

                // if cookie is not set => show notice
                if(cookieExists){
                    createAllNotices(serviceName, currService, true);
                    hideAllNotices(serviceName, currService);
                }else{
                    createAllNotices(serviceName, currService, false);
                }

                lazyLoadThumbnails(serviceName, currService.thumbnailUrl);
            }
        }
    };

    const fnName = 'iframemanager';

    if(typeof window !== 'undefined' && !isFunction(window[fnName])){
        window[fnName] = () => api;
    }

})();