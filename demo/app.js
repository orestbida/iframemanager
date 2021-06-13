
	'use strict';

	// get module
	var iframemanager = iframemanager();

	iframemanager.run({
		currLang: document.documentElement.getAttribute('lang'),
		// autoLang: true,
		services : {
			youtube : {
				embedUrl: 'https://www.youtube-nocookie.com/embed/{data-id}',
				
				iframe : {
					allow : 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen;',
				},
				cookie : {						
					name : 'cc_youtube'
				},
				languages : {
					'en' : {
						notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer" href="https://www.youtube.com/t/terms" title="Terms and conditions" target="_blank">terms and conditions</a> of youtube.com.',
						loadBtn: 'Load video',
						loadAllBtn: 'Don\'t ask again'
					}
				}
			},
			dailymotion : {
				embedUrl: 'https://www.dailymotion.com/embed/video/{data-id}',
				
				// Use dailymotion api to obtain thumbnail
				thumbnailUrl: function(id, callback){
				
					var url = "https://api.dailymotion.com/video/" + id + "?fields=thumbnail_large_url";
					var xhttp = new XMLHttpRequest();
					
					xhttp.onreadystatechange = function() {
						if (this.readyState == 4 && this.status == 200) {
							var src = JSON.parse(this.response).thumbnail_large_url;
							callback(src);
						}
					};

					xhttp.open("GET", url, true);
					xhttp.send();
				},
				iframe : {
					allow : 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen;'
				},
				cookie : {						
					name : 'cc_dailymotion'
				},
				languages : {
					'en' : {
						notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer" href="#link_dailymotion" title="Terms and conditions" target="_blank">terms and conditions</a> of dailymotion.com.',
						loadBtn: 'Load video',
						loadAllBtn: 'Don\'t ask again'
						
					}
				}
			},
			"twitch" : {
				embedUrl: 'https://player.twitch.tv/?{data-id}&parent=localhost',
				iframe : {
					allow : 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen;',
					params: '',// optional
				},
				cookie : {						
					name : 'cc_twitch'
				},
				languages : {
					'en' : {
						notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer" href="#link_twitch" title="Terms and conditions" target="_blank">terms and conditions</a> of twitch.com.',
						loadBtn: 'Load stream',
						loadAllBtn: 'Don\'t ask again'
					}
				}
			}
		}
	});
