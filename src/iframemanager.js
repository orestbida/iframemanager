/*!
 * iframemanager v1.1.0
 * Author Orest Bida
 * Released under the MIT License
 */
(function(){
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
     * @property {Language} languages
     * @property {Function} [onAccept]
     * @property {Function} [onReject]
     */

    var

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
        services = null,

        /**
         * @type {string[]}
         */
        serviceNames = [],

        doc = document,

        /**
         * Prevent direct use of the following
         * props. in the `iframe` element to avoid
         * potential issues
         */
        disallowedProps = ['onload', 'onerror', 'src'];

    /**
     * @param {HTMLDivElement} div
     * @returns {IframeObj}
     */
    function getVideoProp(div){

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
    function lazyLoadThumnails(serviceName, thumbnailUrl){

        var videos = iframeDivs[serviceName];

        if ("IntersectionObserver" in window) {
            var thumbnailObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry){
                    if(entry.isIntersecting){
                        // true index of the video in the array relative to current service
                        loadThumbnail(thumbnailUrl, videos[entry.target.dataset.index]);
                        thumbnailObserver.unobserve(entry.target);
                    }
                });
            });

            videos.forEach(function(video) {
                thumbnailObserver.observe(video._div);
            });
        }else{
            // Fallback for old browsers
            for(var i=0; i<videos.length; i++){
                loadThumbnail(thumbnailUrl, videos[i]);
            }
        }
    };


    /**
     * Set image as background
     * @param {string} url
     * @param {IframeObj} video
     */
    function loadThumbnail(url, video){

        // Set custom thumbnail if provided
        if(typeof video._thumbnail === 'string'){
            video._thumbnailPreload && preloadThumbnail(video._thumbnail);
            video._thumbnail !== '' && loadBackgroundImage(video._thumbnail);
        }else{

            if(typeof url === "function"){

                url(video._id, function(src){
                    preconnect(src);
                    video._thumbnailPreload && preloadThumbnail(src);
                    loadBackgroundImage(src);
                });

            }else if(typeof url === 'string'){
                var src = url.replace('{data-id}', video._id);
                preconnect(src);
                video._thumbnailPreload && preloadThumbnail(src);
                loadBackgroundImage(src);
            }
        }

        function loadBackgroundImage(src){
            video._backgroundDiv.style.backgroundImage = "url('"+src+"')";

            var img = new Image();
            img.onload = function(){
                video._backgroundDiv.classList.add('loaded');
            };

            img.src = src;
        }
    };

    /**
     * Create iframe and append it into the specified div
     * @param {IframeObj} video
     * @param {Service} service
     */
    function createIframe(video, service) {

        // Create iframe only if doesn't alredy have one
        if(video._hasIframe)
            return;

        video._hasIframe = true;

        if(typeof service.onAccept === 'function'){

            // Let the onAccept method create the iframe
            service.onAccept(video._div, function(iframe){
                video._iframe = iframe;
                video._hasIframe = true;
                video._div.classList.add('c-h-b');
            });

            return;
        }

        video._iframe = createNode('iframe');
        var iframeParams = video._params || (service.iframe && service.iframe.params);

        // Replace data-id with valid resource id
        var embedUrl = service.embedUrl || '';
        var src = embedUrl.replace('{data-id}', video._id);

        video._title && (video._iframe.title = video._title);

        // Add parameters to src
        if(iframeParams){
            if (iframeParams.substring(0, 3) === 'ap:'){
                src += iframeParams.substring(3);
            }else{
                src += '?' + iframeParams;
            }
        }

        var iframeProps = service.iframe;

        // When iframe is loaded => hide background image
        video._iframe.onload = function(){
            video._div.classList.add('c-h-b');
            video._iframe.onload = undefined;

            iframeProps
            && typeof iframeProps.onload === 'function'
            && iframeProps.onload(video._id, video._iframe);
        };

        /**
         * Add global internal attributes
         */
        for(var key in iframeProps){
            setAttribute(video._iframe, key, iframeProps[key])
        }

        /**
         * Add all data-attr-* attributes (iframe specific)
         */
        for(var attr in video._iframeAttributes){
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
    function setAttribute(el, attrKey, attrValue){
        if(!disallowedProps.includes(attrKey))
            el.setAttribute(attrKey, attrValue);
    }

    /**
     * Remove iframe HTMLElement from div
     * @param {IframeObj} video
     */
    var removeIframe = function(video){
        video._iframe.parentNode.removeChild(video._iframe);
        video._hasIframe = false;
    };

    /**
     * Remove necessary classes to hide notice
     * @param {IframeObj} video
     */
    function hideNotice(video){
        video._div.classList.add('c-h-n');
        video._showNotice = false;
    };

    /**
     * Add necessary classes to show notice
     * @param {IframeObj} video
     */
    var showNotice = function(video){
        video._div.classList.remove('c-h-n', 'c-h-b');
        video._showNotice = true;
    };

    /**
     * Get cookie by name
     * @param {string} a cookie name
     * @returns {string} cookie value
     */
    var getCookie = function(a) {
        return (a = doc.cookie.match("(^|;)\\s*" + a + "\\s*=\\s*([^;]+)")) ? a.pop() : '';
    };

    /**
     * Set cookie based on given object
     * @param {CookieStructure} cookie
     */
    var setCookie = function(cookie) {

        var date = new Date();
        var path = cookie.path || '/';
        var expiration = cookie.expiration || 182;
        var sameSite = cookie.sameSite || 'Lax';
        var domain = cookie.domain || location.hostname;

        date.setTime(date.getTime() + (1000 * ( expiration * 24 * 60 * 60)));
        var expires = ' expires=' + date.toUTCString();

        var cookieStr = cookie.name + '=1;' + expires + '; Path=' + path + ';';
        cookieStr += ' SameSite=' + sameSite + ';';

        // assures cookie works with localhost (=> don't specify domain if on localhost)
        if(domain.indexOf('.') > -1){
            cookieStr += ' Domain=' + domain + ';';
        }

        if(location.protocol === 'https:') {
            cookieStr += ' Secure;';
        }

        doc.cookie = cookieStr;
    };

    /**
     * Delete cookie by name & path
     * @param {CookieStructure} cookie
     */
    var eraseCookie = function(cookie) {
        var path = cookie.path || '/';
        var domain = cookie.domain || location.hostname;
        var expires = 'Expires=Thu, 01 Jan 1970 00:00:01 GMT;';

        doc.cookie = cookie.name +'=; Path='+ path +'; Domain=' + domain + '; ' + expires;
    };

    /**
     * Get all prop. keys defined inside object
     * @param {any} obj
     */
    var getKeys = function(obj){
        return obj && Object.keys(obj) || [];
    };

    /**
     * Add link rel="preconnect"
     * @param {string} _url
     */
    var preconnect = function(_url){
        var url = _url.split('://');
        var protocol = url[0];

        // if valid protocol
        if(
            protocol === 'http' ||
            protocol === 'https'
        ){
            var domain = (url[1] && url[1].split('/')[0]) || false;

            // if not current domain
            if(domain && domain !== location.hostname){
                if(preconnects.indexOf(domain) === -1){
                    var l = createNode('link');
                    l.rel = 'preconnect';
                    l.href = protocol + '://' + domain;
                    appendChild(doc.head, l);
                    preconnects.push(domain);
                }
            }
        }
    };

    /**
     * Add link rel="preload"
     * @param {string} url
     */
    function preloadThumbnail(url){
        if(url && preloads.indexOf(url) === -1){
            var l = createNode('link');
            l.rel = 'preload';
            l.as = 'image';
            l.href = url;
            appendChild(doc.head, l);
            preloads.push(url);
        }
    }

    /**
     * Create and return HTMLElement based on specified type
     * @param {string} type
     * @returns {HTMLElement}
     */
    function createNode(type){
        return doc.createElement(type);
    }

    /**
     * @returns {HTMLDivElement}
     */
    function createDiv() {
        return createNode('div');
    }

    /**
     * @returns {HTMLButtonElement}
     */
    function createButton() {
        const btn = createNode('button');
        btn.type = 'button';
        return btn;
    }

    /**
     * @param {HTMLElement} el
     * @param {string} className
     */
    function setClassName(el, className){
        el.className = className;
    }

    /**
     * @param {HTMLElement} parent
     * @param {HTMLElement} child
     */
    function appendChild(parent, child){
        parent.appendChild(child);
    }

    /**
     * Create all notices relative to the specified service
     * @param {string} serviceName
     * @param {Service} service
     * @param {boolean} hidden
     */
    var createAllNotices = function(serviceName, service, hidden){

        // get number of iframes of current service
        var _iframes = iframeDivs[serviceName];
        var nIframes = _iframes.length;
        var languages = service.languages;

        // for each iframe
        for(var i=0; i<nIframes; i++){
            (function(i){

                var video = _iframes[i];

                if(!video._hasNotice){
                    var loadBtnText = languages[currLang].loadBtn;
                    var noticeText = languages[currLang].notice;
                    var loadAllBtnText = languages[currLang].loadAllBtn;

                    var fragment = doc.createDocumentFragment();
                    var notice = createDiv();
                    var span = createDiv();
                    var innerDiv = createDiv();

                    if(loadBtnText){
                        var load_button = createButton();
                        load_button.textContent = loadBtnText;
                        setClassName(load_button, 'c-l-b');

                        load_button.addEventListener('click', showVideo);
                    }

                    if(loadAllBtnText){
                        var load_all_button = createButton()
                        load_all_button.textContent = loadAllBtnText;
                        setClassName(load_all_button, 'c-la-b');

                        load_all_button.addEventListener('click', function(){
                            showVideo();
                            api.acceptService(serviceName);
                        });
                    }

                    var notice_text = createDiv();
                    var ytVideoBackground = createDiv();
                    var loaderBg = createDiv();
                    var ytVideoBackgroundInner = createDiv();
                    var notice_text_container = createDiv();
                    var buttons = createDiv();

                    setClassName(notice_text, 'cc-text');
                    setClassName(ytVideoBackgroundInner, 'c-bg-i');

                    video._backgroundDiv = ytVideoBackgroundInner;
                    setClassName(loaderBg, 'c-ld');

                    if(typeof video._thumbnail !== 'string' || video._thumbnail !== ''){
                        setClassName(ytVideoBackground, 'c-bg');
                    }

                    var iframeTitle = video._title;
                    var fragment_2 = doc.createDocumentFragment();

                    if(iframeTitle) {
                        var title_span = createNode('span');
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

                    loadBtnText && appendChild(buttons, load_button);
                    loadAllBtnText && appendChild(buttons, load_all_button);

                    appendChild(notice_text_container, span);
                    appendChild(notice_text_container, buttons);

                    appendChild(innerDiv, notice_text_container);
                    appendChild(notice, innerDiv);

                    function showVideo(){
                        hideNotice(video);
                        createIframe(video, service);
                    }


                    appendChild(ytVideoBackground, ytVideoBackgroundInner);
                    appendChild(fragment, notice);
                    (service.thumbnailUrl || video._thumbnail) && appendChild(fragment, ytVideoBackground);
                    appendChild(fragment, loaderBg);

                    hidden && video._div.classList.add('c-h-n');

                    // Avoid reflow with fragment (only 1 appendChild)
                    appendChild(video._div, fragment);
                    video._hasNotice = true;
                }
            })(i);
        }
    };

    /**
     * Hides all notices relative to the specified service
     * and creates iframe with the video
     * @param {string} serviceName
     * @param {Service} service
     */
    var hideAllNotices = function(serviceName, service){

        // get number of iframes of current service
        var videos = iframeDivs[serviceName];

        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function(entries) {
                if(stopObserver){
                    observer.disconnect();
                    return;
                }
                for(var i=0; i<entries.length; ++i){
                    if(entries[i].isIntersecting){
                        (function(_index){
                            setTimeout(function(){
                                var index = entries[_index].target.dataset.index;
                                createIframe(videos[index], service);
                                hideNotice(videos[index]);
                            }, _index*50);
                            observer.unobserve(entries[_index].target);
                        })(i);
                    }
                }
            });

            videos.forEach(function(video){
                if(!video._hasIframe)
                    observer.observe(video._div);
            });
        }else{
            for(var i=0; i<videos.length; i++){
                (function(index){
                    createIframe(videos[i], service);
                    hideNotice(videos[index]);
                })(i);
            }
        }
    };


    /**
     * Show all notices relative to the specified service
     * and hides iframe with the video
     * @param {string} serviceName
     * @param {Service} service
     */
    var showAllNotices = function(serviceName, service){

        // get number of iframes of current service
        var videos = iframeDivs[serviceName];
        var nDivs = videos.length;

        for(var i=0; i<nDivs; i++){
            (function(index){
                // if doesn't have iframe => create it
                if(videos[i]._hasIframe){
                    if(typeof service.onReject === 'function'){
                        service.onReject(videos[i]._iframe);
                        videos[i]._hasIframe = false;
                    }else{
                        removeIframe(videos[i]);
                    }
                }
                showNotice(videos[index]);
            })(i);
        }
    };

    /**
     * Validate language (make sure it exists)
     * @param {string} lang
     * @param {Object} allLanguages
     * @returns {string} language
     */
    var getValidatedLanguage = function(lang, allLanguages){
        if(allLanguages.hasOwnProperty(lang)){
            return lang;
        }else if(getKeys(allLanguages).length > 0){
            if(allLanguages.hasOwnProperty(currLang)){
                return currLang ;
            }else{
                return getKeys(allLanguages)[0];
            }
        }
    };

    /**
     * Get current client's browser language
     * @returns {string} browser language
     */
    var getBrowserLang = function(){
        return navigator.language.slice(0, 2).toLowerCase()
    };

    var api = {

        /**
         * 1. Set cookie (if not alredy set)
         * 2. show iframes (relative to the specified service)
         * @param {string} serviceName
         */
        acceptService : function(serviceName){
            stopObserver = false;

            if(serviceName === 'all'){
                var length = serviceNames.length;
                for(var i=0; i<length; i++){
                    var serviceName = serviceNames[i];
                    acceptHelper(serviceName, services[serviceName]);
                }
            }else if(serviceNames.indexOf(serviceName) > -1){
                acceptHelper(serviceName, services[serviceName]);
            }

            function acceptHelper(serviceName, service){
                if(!getCookie(service.cookie.name)){
                    setCookie(service.cookie);
                }
                hideAllNotices(serviceName, service);
            }
        },

        /**
         * 1. set cookie
         * 2. hide all notices
         * 3. how iframes (relative to the specified service)
         * @param {string} service_name
         */
        rejectService : function(serviceName){
            if(serviceName === 'all'){
                stopObserver = true;
                var length = serviceNames.length;
                for(var i=0; i<length; i++){
                    var serviceName = serviceNames[i];
                    rejectHelper(serviceName, services[serviceName]);
                }
            }else{
                if(serviceNames.indexOf(serviceName) > -1){
                    rejectHelper(serviceName, services[serviceName]);
                }
            }

            function rejectHelper(serviceName, service){
                if(getCookie(service.cookie.name)){
                    eraseCookie(service.cookie);
                }

                showAllNotices(serviceName, service);
            }
        },

        observe : function(target, callback){
            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if(mutation.type === 'childList'){
                        setTimeout(function(){
                            callback(target.querySelector('iframe'));
                        }, 300);

                        // later, you can stop observing
                        observer.disconnect();
                        return;
                    }
                });
            });

            if(target.querySelector('iframe')){
                setTimeout(function(){
                    callback(target.querySelector('iframe'));
                }, 300);
            }else{
                // pass in the target node, as well as the observer options
                observer.observe(target, {
                    attributes: false,
                    childList: true,
                    subtree: false
                });
            }
        },

        run : function(_config) {
            /**
             * Object with all services config.
             */
            services = _config.services;

            /**
             * Array containing the names of all services
             */
            serviceNames = getKeys(services);

            /**
             * Number of services
             */
            var nServices = serviceNames.length;

            // if there are no services => don't do anything
            if(nServices === 0){
                return;
            }

            // Set curr lang
            currLang = _config.currLang;
            var languages = services[serviceNames[0]].languages;

            if(_config.autoLang === true){
                currLang = getValidatedLanguage(getBrowserLang(), languages);
            }else{
                if(typeof _config.currLang === 'string'){
                    currLang = getValidatedLanguage(_config.currLang, languages);
                }
            }

            // for each service
            for(var i=0; i<nServices; i++){

                /**
                 * Name of current service
                 */
                var serviceName = serviceNames[i];

                // add new empty array of videos (with current service name as property)
                iframeDivs[serviceName] = [];

                /**
                 * iframes/divs in the dom that have data-service value as current service name
                 */
                /**
                 * @type {NodeListOf<HTMLDivElement>}
                 */
                var foundDivs = doc.querySelectorAll('div[data-service="' + serviceName + '"]');


                /**
                 * number of iframes with current service
                 */
                var nDivs = foundDivs.length;

                // if no iframes found => go to next service
                if(nDivs === 0){
                    continue;
                }

                // add each iframe to array of iframes of the current service
                for(var j=0; j<nDivs; j++){
                    foundDivs[j].dataset.index = j;
                    iframeDivs[serviceName].push(getVideoProp(foundDivs[j]));
                }

                var currService = services[serviceName];

                // check if cookie for current service is set
                var cookie_name = currService.cookie.name;

                // get current service's cookie value
                var cookie = getCookie(cookie_name);

                // if cookie is not set => show notice
                if(cookie){
                    createAllNotices(serviceName, currService, true);
                    hideAllNotices(serviceName, currService);
                }else{
                    createAllNotices(serviceName, currService, false);
                }

                lazyLoadThumnails(serviceName, currService.thumbnailUrl);
            }
        }
    };

    var fn_name = 'iframemanager';

    window[fn_name] = function(){
        window[fn_name] = undefined;
        return api;
    };

})();