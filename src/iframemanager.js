/*!
 * iframemanager v1.2.5
 * Author Orest Bida
 * Released under the MIT License
 */
(() => {
    'use strict';

    /**
     * @typedef {Object} servicePropObj
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
     * @typedef {Object} ServiceConfig
     * @property {string} embedUrl
     * @property {string | () => string} [thumbnailUrl]
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
         * @type {Object.<string, servicePropObj[]>}
         */
        allServiceProps = {},

        /**
         * @type {Object.<string, IntersectionObserver>}
         */
        serviceObservers = {},

        /**
         * @type {Object.<string, boolean>}
         */
        stopServiceObserver = {},

        currLang = '',

        /**
         * @type {Object.<string, ServiceConfig>}
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
    };

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
            setAttribute(iframe, key, attrs[key]);
    };

    /**
     * @param {HTMLDivElement} serviceDiv
     * @returns {servicePropObj}
     */
    const getDivProps = (serviceDiv) => {

        const dataset = serviceDiv.dataset;
        const iframeAttrs = {};
        const iframeAttrSelector = 'data-iframe-';

        const iframeAttrNames = serviceDiv.getAttributeNames()
            .filter(attr => attr.slice(0, 12) === iframeAttrSelector)
            .map(attr => attr.slice(12));

        const placeholderDiv = serviceDiv.querySelector('[data-placeholder]');
        const dataVisible = placeholderDiv && placeholderDiv.hasAttribute('data-visible');
        dataVisible && placeholderDiv.removeAttribute('data-visible');
        const placeholderClone = placeholderDiv && placeholderDiv.cloneNode(true);

        /**
         * Get all "data-iframe-* attributes
         */
        for(const attrName of iframeAttrNames)
            iframeAttrs[attrName] = serviceDiv.getAttribute(iframeAttrSelector + attrName);

        return {
            _id: dataset.id,
            _title: dataset.title,
            _thumbnail: dataset.thumbnail,
            _params: dataset.params,
            _div: serviceDiv,
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

        const serviceProps = allServiceProps[serviceName];

        if ('IntersectionObserver' in win) {
            const thumbnailObserver = new IntersectionObserver((entries) => {
                for(const entry of entries){
                    if(entry.isIntersecting){
                        // index relative to the current service array
                        loadThumbnail(thumbnailUrl, serviceProps[entry.target.dataset.index]);
                        thumbnailObserver.unobserve(entry.target);
                    }
                }
            });

            for(const serviceProp of serviceProps)
                thumbnailObserver.observe(serviceProp._div);
        }
    };


    /**
     * @param {string} url
     * @param {servicePropObj} serviceProp
     */
    const loadThumbnail = (url, serviceProp) => {

        const loadBackgroundImage = (src) => {
            serviceProp._backgroundDiv.style.backgroundImage = `url('${src}')`;

            const img = new Image();
            img.onload = () => addClass(serviceProp._backgroundDiv, 'loaded');
            img.src = src;
        };

        // Set custom thumbnail if provided
        if(isString(serviceProp._thumbnail)){
            serviceProp._thumbnail !== '' && loadBackgroundImage(serviceProp._thumbnail);
        }else{

            if(isFunction(url)){
                url(serviceProp._id, (src) => loadBackgroundImage(src));

            }else if(isString(url)){
                const src = url.replace(DATA_ID_PLACEHOLDER, serviceProp._id);
                loadBackgroundImage(src);
            }
        }

    };

    /**
     * Create iframe and append it into the specified div
     * @param {servicePropObj} serviceProp
     * @param {ServiceConfig} serviceConfig
     */
    const createIframe = (serviceProp, serviceConfig) => {

        // Create iframe only if doesn't already have one
        if(serviceProp._hasIframe)
            return;

        serviceProp._hasIframe = true;

        if(serviceProp._placeholderDiv){
            const newFreshPlaceholder = serviceProp._initialPlaceholderClone.cloneNode(true);
            serviceProp._placeholderDiv.replaceWith(newFreshPlaceholder);
            serviceProp._placeholderDiv = newFreshPlaceholder;
        }

        const iframeProps = serviceConfig.iframe;

        if(isFunction(serviceConfig.onAccept)){

            // Let the onAccept method create the iframe
            serviceConfig.onAccept(serviceProp._div, (iframe) => {

                if(!(iframe instanceof HTMLIFrameElement))
                    return false;

                /**
                 * Add global internal attributes
                 */
                setIframeAttributes(iframe, iframeProps);

                /**
                 * Add all data-attr-* attributes (iframe specific)
                 */
                setIframeAttributes(iframe, serviceProp._iframeAttributes);

                serviceProp._iframe = iframe;
                serviceProp._hasIframe = true;

                // Hide loading circle
                addClass(serviceProp._div, HIDE_LOADER_CLASS);

                // Show placeholder
                (!serviceProp._dataPlaceholderVisible || serviceProp._dataWidget)
                    && addClass(serviceProp._div, SHOW_PLACEHOLDER_CLASS);
            });

            return;
        }

        serviceProp._iframe = createNode('iframe');

        const iframeConfig = serviceConfig.iframe;

        /**
         * @type {string}
         */
        const iframeParams = serviceProp._params || iframeConfig && iframeConfig.params;

        // Replace data-id with valid resource id
        const embedUrl = serviceConfig.embedUrl || '';
        let src = embedUrl.replace(DATA_ID_PLACEHOLDER, serviceProp._id);

        serviceProp._title && (serviceProp._iframe.title = serviceProp._title);

        // Add parameters to src
        if(iframeParams && isString(iframeParams)){
            src += iframeParams.slice(0, 1) === '?'
                ? iframeParams
                : `?${iframeParams}`;
        }

        // When iframe is loaded => hide background image
        serviceProp._iframe.onload = () => {
            addClass(serviceProp._div, HIDE_LOADER_CLASS);
            serviceProp._iframe.onload = undefined;

            isFunction(iframeProps && iframeProps.onload)
                && iframeProps.onload(serviceProp._id, serviceProp._iframe);
        };

        /**
         * Add global internal attributes
         */
        setIframeAttributes(serviceProp._iframe, iframeProps);

        /**
         * Add all data-attr-* attributes (iframe specific)
         */
        setIframeAttributes(serviceProp._iframe, serviceProp._iframeAttributes);

        serviceProp._iframe.src = src;

        appendChild(serviceProp._innerContainer, serviceProp._iframe);
    };

    /**
     * @param {HTMLElement} el
     * @param {string} attrKey
     * @param {string} attrValue
     */
    const setAttribute = (el, attrKey, attrValue) => {
        if(!disallowedProps.includes(attrKey))
            el.setAttribute(attrKey, attrValue);
    };

    /**
     * Remove iframe HTMLElement from div
     * @param {servicePropObj} serviceProp
     */
    const removeIframe = (serviceProp) => {
        serviceProp._iframe && serviceProp._iframe.remove();
        serviceProp._hasIframe = false;
    };

    /**
     * Add necessary classes to hide notice
     * @param {servicePropObj} serviceProp
     */
    const hideNotice = (serviceProp) => {
        addClass(serviceProp._div, HIDE_NOTICE_CLASS);
        serviceProp._showNotice = false;
    };

    /**
     * Add necessary classes to show notice
     * @param {servicePropObj} serviceProp
     */
    const showNotice = (serviceProp) => {
        serviceProp._div.classList.remove(
            HIDE_NOTICE_CLASS,
            HIDE_LOADER_CLASS,
            SHOW_PLACEHOLDER_CLASS
        );
        serviceProp._showNotice = true;
    };

    /**
     * Get cookie by name
     * @param {string} a cookie name
     * @returns {string} cookie value
     */
    const getCookie = (a) => {
        a = doc.cookie.match(`(^|;)\\s*${a}\\s*=\\s*([^;]+)`);

        return a ? a.pop() : '';
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
     * @param {ServiceConfig} serviceConfig
     * @param {boolean} hidden
     */
    const createAllNotices = (serviceName, serviceConfig, hidden) => {

        // get number of iframes of current service
        const serviceProps = allServiceProps[serviceName];
        const languages = serviceConfig.languages;

        serviceProps.forEach(serviceProp => {

            if(!serviceProp._hasNotice && languages){
                const lang = languages[currLang];
                const loadBtnText = lang && lang.loadBtn;
                const noticeText = lang && lang.notice;
                const loadAllBtnText = lang && lang.loadAllBtn;

                const fragment = doc.createElement('div');
                const notice = createDiv();
                const span = createDiv();
                const innerDiv = createDiv();
                const buttons = createDiv();

                setClassName(fragment, 'cll');
                serviceProp._innerContainer = fragment;

                const showVideo = () => {
                    hideNotice(serviceProp);
                    createIframe(serviceProp, serviceConfig);
                };

                if(loadBtnText){
                    const load_button = createButton();
                    load_button.textContent = loadBtnText;
                    setClassName(load_button, 'c-l-b');

                    load_button.addEventListener(CLICK_EVENT_SOURCE, showVideo);
                    appendChild(buttons, load_button);
                }

                if(loadAllBtnText){
                    const load_all_button = createButton();
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

                serviceProp._backgroundDiv = ytVideoBackgroundInner;
                setClassName(loaderBg, 'c-ld');

                if(!isString(serviceProp._thumbnail) || serviceProp._thumbnail !== ''){
                    setClassName(ytVideoBackground, 'c-bg');
                }

                const iframeTitle = serviceProp._title;
                const fragment_2 = doc.createDocumentFragment();

                if(iframeTitle) {
                    const title_span = createNode('span');
                    setClassName(title_span, 'c-tl');
                    title_span.insertAdjacentHTML('beforeend', iframeTitle);
                    appendChild(fragment_2, title_span);
                }

                appendChild(notice_text, fragment_2);
                notice && notice_text.insertAdjacentHTML('beforeend', noticeText || '');
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
                (serviceConfig.thumbnailUrl || serviceProp._thumbnail) && appendChild(fragment, ytVideoBackground);
                appendChild(fragment, loaderBg);

                hidden && addClass(serviceProp._div, HIDE_NOTICE_CLASS);

                // Avoid reflow with fragment (only 1 appendChild)
                serviceProp._div.prepend(fragment);
                serviceProp._hasNotice = true;

                setTimeout(()=> addClass(serviceProp._div, 'c-an'), 20);
            }
        });
    };

    /**
     * Hide notices for the specified service
     * and then create iframes.
     *
     * @param {string} serviceName
     * @param {ServiceConfig} serviceConfig
     */
    const hideAllNotices = (serviceName, serviceConfig) => {

        // get number of iframes of current service
        const serviceProps = allServiceProps[serviceName];

        const observeServiceDiv = (div, serviceName) => {

            if(!serviceObservers[serviceName]) {
                serviceObservers[serviceName] = new IntersectionObserver((entries) => {

                    if(stopServiceObserver[serviceName]){
                        serviceObservers[serviceName].disconnect();
                        return;
                    }

                    for(let i=0; i<entries.length; ++i){
                        if(entries[i].isIntersecting){
                            ((i) => {
                                /**
                                 * @type {HTMLDivElement}
                                 */
                                const target = entries[i].target;
                                const dataIndex = target.dataset.index;
                                createIframe(serviceProps[dataIndex], serviceConfig);

                                setTimeout(() => {
                                    hideNotice(serviceProps[dataIndex]);
                                }, i*50);

                                serviceObservers[serviceName].unobserve(target);
                            })(i);
                        }
                    }

                });
            }

            serviceObservers[serviceName].observe(div);
        };

        serviceProps.forEach((serviceProp) => {
            if(!serviceProp._hasIframe)
                observeServiceDiv(serviceProp._div, serviceName);
        });
    };


    /**
     * Show notices for the specified service
     * and remove iframes.
     *
     * @param {string} serviceName
     * @param {ServiceConfig} serviceConfig
     */
    const showAllNotices = (serviceName, serviceConfig) => {

        const serviceProps = allServiceProps[serviceName];

        for(let i=0; i<serviceProps.length; i++){
            ((i) => {

                /**
                 * Create iframe if it doesn't exist
                 */
                if(serviceProps[i]._hasIframe){
                    if(isFunction(serviceConfig.onReject)){
                        serviceConfig.onReject(serviceProps[i]._iframe, serviceProps[i]._div, () => showNotice(serviceProps[i]));
                        serviceProps[i]._hasIframe = false;
                    } else {
                        removeIframe(serviceProps[i]);
                    }
                }

                showNotice(serviceProps[i]);
            })(i);
        }
    };

    /**
     * Validate language (make sure it exists)
     *
     * @param {string} lang
     * @param {Object.<string, Object>} allLanguages
     * @returns {string} language
     */
    const getValidatedLanguage = (lang, allLanguages) => {
        if(lang in allLanguages){
            return lang;
        }else if(getKeys(allLanguages).length > 0){
            return currLang in allLanguages
                ? currLang
                : getKeys(allLanguages)[0];
        }
    };

    /**
     * @param {string} serviceName
     * @param {ServiceConfig} serviceConfig
     */
    const acceptHelper = (serviceName, serviceConfig) => {
        const { cookie } = serviceConfig;

        if(!getCookie(cookie.name))
            setCookie(cookie);

        hideAllNotices(serviceName, serviceConfig);
    };

    /**
     * @param {string} serviceName
     * @param {ServiceConfig} serviceConfig
     */
    const rejectHelper = (serviceName, serviceConfig) => {
        const { cookie } = serviceConfig;

        if(getCookie(cookie.name))
            eraseCookie(cookie);

        showAllNotices(serviceName, serviceConfig);
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
    };

    const api = {

        /**
         * @param {string} serviceName
         */
        acceptService: (serviceName) => {
            const changedServices = [];

            if(serviceName === 'all'){

                for(const name of serviceNames){
                    stopServiceObserver[name] = false;

                    if(!servicesState.get(name)){
                        servicesState.set(name, true);
                        acceptHelper(name, services[name]);
                        changedServices.push(name);
                    }
                }

                changedServices.length > 0 && fireOnChangeCallback(serviceName, ACCEPT_ACTION, changedServices);

            }else if(serviceNames.includes(serviceName)){
                stopServiceObserver[serviceName] = false;

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

                for(const name of serviceNames){
                    stopServiceObserver[name] = true;
                    rejectHelper(name, services[name]);

                    if(servicesState.get(name)){
                        servicesState.set(name, false);
                        changedServices.push(name);
                    }
                }

                changedServices.length > 0 && fireOnChangeCallback(serviceName, REJECT_ACTION, changedServices);

            }else if(serviceNames.includes(serviceName)){
                stopServiceObserver[serviceName] = true;
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
                .filter(([, value]) => !!value)
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
                 * @type {CookieStructure}
                 */
                const cookieObj = (currService.cookie = currService.cookie || {});
                const cookieName = (cookieObj.name = cookieObj.name || `im_${serviceName}`);

                const cookieExists = getCookie(cookieName);
                servicesState.set(serviceName, !!cookieExists);

                // add new empty array of serviceProps (with current service name as property)
                allServiceProps[serviceName] = [];

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
                    allServiceProps[serviceName].push(getDivProps(foundDivs[j]));
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