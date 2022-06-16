/*!
 * iframemanager v1.0
 * Author Orest Bida
 * Released under the MIT License
 */
(function(){
    'use strict';

    var module = {
        iframes : {},
        preconnects : [],
        preloads: [],
        iframeObserver : null,
        currLang : null,
        services : null,
        serviceNames : null,
        
        _getVideoProp : function(_div){
            return {
                _id: _div.dataset.id,
                _title: _div.dataset.title,
                thumbnail: _div.dataset['thumbnail'],
                params: _div.dataset['params'],
                attributes: _div.dataset['attributes'],
                thumbnailPreload: _div.hasAttribute('data-thumbnailpreload'),
                div: _div,
                backgroundDiv: null,
                hasIframe: false,
                hasNotice: false,
                showNotice : true
            }
        },

        /**
         * Lazy load all thumbnails of the iframes relative to specified service
         * @param {String} service_name 
         * @param {String} thumbnail_url 
         */
        _lazyLoadThumnails : function(service_name, thumbnail_url){

            var videos = this.iframes[service_name];
            var length = videos.length;

            if ("IntersectionObserver" in window) {
                var thumbnailObserver = new IntersectionObserver(function(entries) {
                    entries.forEach(function(entry){
                        if(entry.isIntersecting){
                            // true index of the video in the array relative to current service
                            var _index = entry.target.dataset.index;
                            module._loadThumbnail(thumbnail_url, videos[_index]);
                            thumbnailObserver.unobserve(entry.target);
                        }
                    });
                });
   
                for(var i=0; i<length; i++){
                    thumbnailObserver.observe(videos[i].div);
                }
            }else{
                // Fallback for old browsers
                for(var i=0; i<length; i++){
                    module._loadThumbnail(thumbnail_url, videos[i]);
                }
            }
        },

        /**
         * 1. Set cookie (if not alredy set)
         * 2. show iframes (relative to the specified service)
         * @param {String} service_name 
         */
        acceptService : function(service_name){
            if(service_name === 'all'){
                var length = this.serviceNames.length;
                for(var i=0; i<length; i++){
                    var service_name = this.serviceNames[i];
                    _acceptService(service_name, this.services[service_name]);
                }
            }else{
                if(this.serviceNames.indexOf(service_name) > -1){
                    _acceptService(service_name, this.services[service_name]);
                }
            }

            function _acceptService(service_name, service){
                if(!module._getCookie(service['cookie']['name'])){
                    module._setCookie(service['cookie']); 
                }
                module._hideAllNotices(service_name, service);
            }
        },

        /**
         * 1. set cookie
         * 2. hide all notices 
         * 3. how iframes (relative to the specified service)
         * @param {String} service_name 
         */
         rejectService : function(service_name){
            if(service_name === 'all'){
                this.iframeObserver = null;
                var length = this.serviceNames.length;
                for(var i=0; i<length; i++){
                    var service_name = this.serviceNames[i];
                    _rejectService(service_name, this.services[service_name]);
                }
            }else{
                if(this.serviceNames.indexOf(service_name) > -1){
                    _rejectService(service_name, this.services[service_name]);
                }
            }

            function _rejectService(service_name, service){
                if(module._getCookie(service['cookie']['name'])){
                    module._eraseCookie(service['cookie']);
                }
                module._showAllNotices(service_name, service);
            }
        },

        /**
         * Set image as background
         * @param {String} url 
         * @param {Object} video 
         */
        _loadThumbnail: function(url, video){
            
            // Set custom thumbnail if provided
            if(typeof video.thumbnail === 'string'){
                video.thumbnailPreload && this._thumbnailPreload(video.thumbnail);
                video.thumbnail !== "" && _loadBackgroundImage(video.thumbnail);
            }else{

                if(typeof url === "function"){
                    
                    url(video._id, function(src){
                        module._preconnect(src);
                        video.thumbnailPreload && this._thumbnailPreload(src);
                        _loadBackgroundImage(src);
                    });

                }else if(typeof url === "string"){
                    var src = url.replace('{data-id}', video._id);
                    this._preconnect(src);
                    video.thumbnailPreload && this._thumbnailPreload(src);
                    _loadBackgroundImage(src);
                }
            }

            function _loadBackgroundImage(src){
                video.backgroundDiv.style.backgroundImage = "url('"+src+"')";

                var img = new Image();
                img.onload = function(){
                    video.backgroundDiv.classList.add('loaded'); 
                }
                
                img.src = src;
            }
        },

        /**
         * Create iframe and append it into the specified div
         * @param {Object} video 
         * @param {Object} service 
         */
        _createIframe: function(video, service) {
            // Create iframe only if doesn't alredy have one
            if(video.hasIframe) return;

            video.iframe = this._createNode('iframe');
            var iframeParams = video.params || (service['iframe'] && service['iframe']['params']);
            var iframeAttributes = video.attributes || (service['iframe'] && service['iframe']['attributes']);
            
            // Replace data-id with valid resource id
            var src = service['embedUrl'].replace('{data-id}', video._id);

            video.iframe['loading'] = 'lazy';
            video._title && (video.iframe.title = video._title);

            // Add allow attribute to iframe
            if(service['iframe'] && service['iframe']['allow']){
                video.iframe.allow = service['iframe']['allow'];
            }

            // Add parameters to src
            if(iframeParams){
                if (iframeParams.substring(0, 3) === "ap:"){
                    src += iframeParams.substring(3);
                }else{
                    src += "?" + iframeParams
                }
            }

            video.iframe.src = encodeURI(src);

            // load iframe attributes
            if(iframeAttributes){
                if (typeof(iframeAttributes) === 'string') {
                    try {
                        iframeAttributes = JSON.parse(iframeAttributes);
                    } catch (e) {
                        iframeAttributes = {};
                    }
                }
                if (typeof(iframeAttributes) === 'object') {
                    Object.keys(iframeAttributes).forEach(key => {
                        video.iframe[key] = iframeAttributes[key];
                    });
                }
            }

            // When iframe is loaded => hide background image
            video.iframe.onload = function(){
                video.div.classList.add('c-h-b');
                video.iframe.onload = undefined;
                service['iframe'] && typeof service['iframe']['onload'] === 'function' && service['iframe']['onload'](video._id, this);
            }

            video.hasIframe = true;
            video.div.appendChild(video.iframe);          
        },

        /**
         * Remove iframe HTMLElement from div
         * @param {Object} video 
         */
        _removeIframe: function(video){
            video.iframe.parentNode.removeChild(video.iframe);
            video.hasIframe = false;
        },

        /**
         * Remove necessary classes to hide notice
         * @param {Object} video 
         */
        _hideNotice : function(video){
            if(video.showNotice){
                video.div.classList.add('c-h-n');
                video.showNotice = false;
            }
        },

        /**
         * Add necessary classes to show notice
         * @param {Object} video 
         */
        _showNotice : function(video){
            if(!video.showNotice){
                video.div.classList.remove('c-h-n', 'c-h-b');
                video.showNotice = true;
            }
        },

        /**
         * Get cookie by name
         * @param {String} a cookie name
         * @returns {String} cookie value
         */
        _getCookie : function(a) {
            return (a = document.cookie.match("(^|;)\\s*" + a + "\\s*=\\s*([^;]+)")) ? a.pop() : "";
        },

        /**
         * Set cookie based on given object
         * @param {Object} cookie 
         */
        _setCookie : function(cookie) {

            var date = new Date();
            var path = cookie['path'] || "/";
            var expiration = cookie['expiration'] || 182;
            var sameSite = cookie['sameSite'] || "Lax";
            var domain = cookie['domain'] || location.hostname;
            
            date.setTime(date.getTime() + (1000 * ( expiration * 24 * 60 * 60)));
            var expires = " expires=" + date.toUTCString();

            var cookieStr = cookie.name + "=1;" + expires + "; Path=" + path + ";";
            cookieStr += " SameSite=" + sameSite + ";";

            // assures cookie works with localhost (=> don't specify domain if on localhost)
            if(domain.indexOf(".") > -1){
                cookieStr += " Domain=" + domain + ";";
            }

            if(location.protocol === "https:") {
                cookieStr += " Secure;";
            }

            document.cookie = cookieStr;
        },

        /**
         * Delete cookie by name & path
         * @param {Array} cookies 
         * @param {String} custom_path
         */
         _eraseCookie : function(cookie) {
            var path = cookie['path'] || "/";
            var domain = cookie['domain'] || location.hostname;
            var expires = 'Expires=Thu, 01 Jan 1970 00:00:01 GMT;';

            document.cookie = cookie['name'] +'=; Path='+ path +'; Domain=' + domain + '; ' + expires;
        },

        /**
         * Get all prop. keys defined inside object
         * @param {Object} obj 
         */
        _getKeys : function(obj){
            if(typeof obj === "object"){
                var keys = [], i = 0;
                for (keys[i++] in obj) {};
                return keys;
            }
        },

        /**
         * Add link rel="preconnect"
         * @param {String} url 
         */
        _preconnect: function(url){
            var url = url.split("://");
            var protocol = url[0];
            
            // if valid protocol
            if(
                protocol == 'http' || 
                protocol == 'https'
            ){
                var domain = (url[1] && url[1].split("/")[0]) || false;
                
                // if not current domain
                if(domain && domain !== location.hostname){
                    if(this.preconnects.indexOf(domain) === -1){
                        var l = this._createNode('link');
                        l.rel = 'preconnect';
                        l.href = protocol + "://" + domain;
                        document.head.appendChild(l);
                        this.preconnects.push(domain);
                    }
                }
            }
        },

        /**
         * Add link rel="preload"
         * @param {String} url 
         */
        _thumbnailPreload : function(url){
            if(url && this.preloads.indexOf(url) === -1){
                var l = this._createNode('link');
                l.rel = 'preload';
                l.as = 'image';
                l.href = url;
                document.head.appendChild(l);
                this.preloads.push(url);
            }
        },

        /**
         * Create and return HTMLElement based on specified type
         * @param {String} type 
         * @returns {HTMLElement}
         */
        _createNode : function(type){
            return document.createElement(type);
        },

        /**
         * Create all notices relative to the specified service
         * @param {String} service_name 
         * @param {Object} service 
         * @param {Boolean} hidden 
         */
        _createAllNotices : function(service_name, service, hidden){
            // get number of iframes of current service
            var iframes = this.iframes[service_name];
            var n_iframes = iframes.length;
            
            // for each iframe
            for(var i=0; i<n_iframes; i++){
                (function(i){

                    var video = iframes[i];

                    if(!video.hasNotice){

                        var loadBtnText = service['languages'][module.currLang]['loadBtn'];
                        var noticeText = service['languages'][module.currLang]['notice'];
                        var loadAllBtnText = service['languages'][module.currLang]['loadAllBtn'];

                        var fragment = document.createDocumentFragment();
                        var notice = module._createNode('div');
                        var span = module._createNode('span');
                        var innerDiv = module._createNode('p');
                        var load_button = module._createNode('button');
                        var load_all_button = module._createNode('button');
            
                        var notice_text = module._createNode('span');
                        var ytVideoBackground = module._createNode('div');
                        var loaderBg = module._createNode('div');
                        var ytVideoBackgroundInner = module._createNode('div');
                        var notice_text_container = module._createNode('div');
                        var buttons = module._createNode('div');
                        
                        load_button.type = load_all_button.type = 'button';
                        notice_text.className = 'cc-text';
                        load_button.type = load_all_button.type = 'button';
                        notice_text.className = 'cc-text';
                        
                        ytVideoBackgroundInner.className = 'c-bg-i';
                        video.backgroundDiv = ytVideoBackgroundInner;
                        loaderBg.className = 'c-ld';

                        if(typeof video.thumbnail !== 'string' || video.thumbnail !== ""){
                            ytVideoBackground.className = 'c-bg';
                        }
                     

                        var iframeTitle = video._title;
                        var fragment_2 = document.createDocumentFragment();
        
                        if(iframeTitle) {
                            var title_span = module._createNode('span');
                            title_span.className = 'c-tl';
                            title_span.insertAdjacentHTML('beforeend', iframeTitle);
                            fragment_2.appendChild(title_span);
                        }
                        
                        load_button.textContent = loadBtnText;
                        load_all_button.textContent = loadAllBtnText;

                        notice_text.appendChild(fragment_2);
                        notice && notice_text.insertAdjacentHTML('beforeend', noticeText || "");
                        span.appendChild(notice_text);

                      
                        notice_text_container.className = 'c-t-cn';
                        span.className = 'c-n-t';
                        innerDiv.className = 'c-n-c';
                        notice.className = 'c-nt';
                        
                        buttons.className =  'c-n-a';
                        load_button.className = 'c-l-b';
                        load_all_button.className = 'c-la-b';

                        buttons.appendChild(load_button);
                        buttons.appendChild(load_all_button);
           
                        notice_text_container.appendChild(span);
                        notice_text_container.appendChild(buttons);
            
                        innerDiv.appendChild(notice_text_container);
                        notice.appendChild(innerDiv);

                        function showVideo(){
                            module._hideNotice(video);
                            module._createIframe(video, service);
                        }
                        
                        load_button.addEventListener('click', function(){
                            showVideo();
                        });

                        load_all_button.addEventListener('click', function(){
                            showVideo();
                            module.acceptService(service_name);
                        });
            
                        ytVideoBackground.appendChild(ytVideoBackgroundInner);
                        fragment.appendChild(notice);
                        (service['thumbnailUrl'] || video.thumbnail) && fragment.appendChild(ytVideoBackground);
                        fragment.appendChild(loaderBg);

                        hidden && video.div.classList.add('c-h-n');

                        // Avoid reflow with fragment (only 1 appendChild)
                        video.div.appendChild(fragment);
                        video.hasNotice = true;
                    }
                })(i);
            }
        },

        /**
         * Hides all notices relative to the specified service
         * and creates iframe with the video
         * @param {String} service_name 
         * @param {Object} service 
         */
        _hideAllNotices : function(service_name, service){

            // get number of iframes of current service
            var videos = this.iframes[service_name];
            var n_iframes = videos.length;

            if ("IntersectionObserver" in window) {
                this.iframeObserver = new IntersectionObserver(function(entries) {
                    for(var i=0; i<entries.length; ++i){
                        if(module.iframeObserver === null){
                            return;
                        }
                        if(entries[i].isIntersecting){
                            (function(_index){    
                                setTimeout(function(){
                                    var index = entries[_index].target.dataset.index;
                                    module._createIframe(videos[index], service);
                                    module._hideNotice(videos[index]);
                                }, _index*50);
                                module.iframeObserver.unobserve(entries[_index].target);
                            })(i);
                        }
                    }
                });
   
                for(var i=0; i<n_iframes; i++){
                    if(!videos[i].hasIframe){
                        this.iframeObserver.observe(videos[i].div);
                    }
                }
            }else{
                for(var i=0; i<n_iframes; i++){
                    (function(index){
                        module._createIframe(videos[i], service);
                        module._hideNotice(videos[index])
                    })(i);
                }
            }
        },


        /**
         * Show all notices relative to the specified service
         * and hides iframe with the video
         * @param {String} service_name 
         * @param {Object} service 
         */
        _showAllNotices : function(service_name, service){

            // get number of iframes of current service
            var videos = this.iframes[service_name];
            var n_iframes = videos.length;

            for(var i=0; i<n_iframes; i++){
                (function(index){
                    // if doesn't have iframe => create it
                    if(!videos[i].showNotice){
                        if(videos[i].hasIframe){
                            module._removeIframe(videos[i]);
                        }
                        module._showNotice(videos[index]);
                    }
                })(i);
            }
        },

        /**
         * Validate language (make sure it exists)
         * @param {String} lang 
         * @param {Object} all_languages 
         * @returns {String} language
         */
        _getValidatedLanguage : function(lang, all_languages){
            if(all_languages.hasOwnProperty(lang)){
                return lang;
            }else if(this._getKeys(all_languages).length > 0){
                if(all_languages.hasOwnProperty(this.currLang)){
                    return this.currLang ;
                }else{
                    return this._getKeys(all_languages)[0];
                }
            }
        },

        /**
         * Get current client's browser language
         * @returns {String} browser language
         */
        _getBrowserLang : function(){
            var browser_lang = navigator.language || navigator.browserLanguage;
            browser_lang.length > 2 && (browser_lang = browser_lang[0]+browser_lang[1]);
            return browser_lang.toLowerCase()
        },

        run : function(_config) {
            /**
             * Object with all services config.
             */
            var services = _config['services'];
            this.services = services;

            /**
             * Array containing the names of all services
             */
            var service_names = this._getKeys(services);
            this.serviceNames = service_names;

            /**
             * Number of services
             */
            var n_services = service_names.length;

            // if there are no services => don't do anything
            if(n_services === 0){
                return;
            }

            // Set curr lang
            this.currLang = _config['currLang'];
            var languages = services[service_names[0]]['languages'];

            if(_config['autoLang'] === true){
                this.currLang = this._getValidatedLanguage(this._getBrowserLang(), languages);
            }else{
                if(typeof _config['currLang'] === "string"){
                    this.currLang = this._getValidatedLanguage(_config['currLang'], languages);
                }
            }

            // for each service
            for(var i=0; i<n_services; i++){

                /**
                 * Name of current service
                 */
                var service_name = service_names[i];

                // add new empty array of videos (with current service name as property)
                this.iframes[service_name] = [];

                /**
                 * iframes/divs in the dom that have data-service value as current service name
                 */
                var found_iframes = document.querySelectorAll('div[data-service="' + service_name + '"]');
                
                /**
                 * number of iframes with current service
                 */
                var n_iframes = found_iframes.length;

                // if no iframes found => go to next service
                if(n_iframes === 0){
                    continue;
                }

                // add each iframe to array of iframes of the current service
                for(var j=0; j<n_iframes; j++){
                    found_iframes[j].dataset.index = j;
                    this.iframes[service_name].push(this._getVideoProp(found_iframes[j]));
                }

                var curr_service = services[service_name];

                // check if cookie for current service is set
                var cookie_name = curr_service['cookie']['name'];

                // get current service's cookie value
                var cookie = this._getCookie(cookie_name);
    
                // if cookie is not set => show notice
                if(cookie){
                    this._createAllNotices(service_name, curr_service, true);
                    this._hideAllNotices(service_name, curr_service); 
                }else{
                    this._createAllNotices(service_name, curr_service, false);
                }

                this._lazyLoadThumnails(service_name, curr_service['thumbnailUrl']);
            }
        }
    };

    var fn_name = 'iframemanager';

    window[fn_name] = function(){
        window[fn_name] = undefined;
        return module;
    };
    
})();
