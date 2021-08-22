
	'use strict';

	// get module
	var manager = iframemanager();

	manager.run({
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
				thumbnailUrl: function(id, setThumbnail){
				
					var url = "https://api.dailymotion.com/video/" + id + "?fields=thumbnail_large_url";
					var xhttp = new XMLHttpRequest();
					
					xhttp.onreadystatechange = function() {
						if (this.readyState == 4 && this.status == 200) {
							var src = JSON.parse(this.response).thumbnail_large_url;
							setThumbnail(src);
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
			},
			twitter : {
				onAccept: function(div, callback){
				   
					manager.loadScript('https://platform.twitter.com/widgets.js', function(){
						twttr.widgets.createTweet(div.dataset.id, div).then(function(tweet){
							callback(tweet.firstChild);
						});
					});
				},
	
				onReject: function(iframe){
					iframe.parentNode.remove();
				},
	
				cookie : {						
					name : 'cc_twitter'
				},
	
				languages : {
					'en' : {
						notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer" href="https://www.youtube.com/t/terms" title="Terms and conditions" target="_blank">terms and conditions</a> of twitter.com.',
						loadBtn: 'Load tweet',
						loadAllBtn: 'Don\'t ask again'
					}
				}

				
			},

			facebook : {
				embedUrl : "https://www.facebook.com/",

				onAccept: function(div, callback){

					var fbVideo = document.createElement('div');
					fbVideo.className = "fb-post";
					fbVideo.setAttribute('data-href', this.embedUrl + div.dataset.id);
					div.appendChild(fbVideo);
					
					manager.loadScript('https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v11.0', function(){
						var c = document.querySelector(`[data-id="${div.dataset.id}"`).lastChild;
						FB.XFBML.parse(document.querySelector(`[data-id="${div.dataset.id}"`));
						
						manager.observe(fbVideo, function(iframe){
							console.log("wwwaaaa", iframe);
							callback(iframe)
						});
						
						//FB.XFBML.parse(document.querySelector(`[data-id="${div.dataset.id}"`));
						
					});
				},
	
				onReject: function(iframe){
					iframe.parentNode.parentNode.remove();
				},
	
				cookie : {						
					name : 'cc_facebook'
				},
	
				languages : {
					'en' : {
						notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer" href="https://www.youtube.com/t/terms" title="Terms and conditions" target="_blank">terms and conditions</a> of twitter.com.',
						loadBtn: 'Load tweet',
						loadAllBtn: 'Don\'t ask again'
					}
				}
			}
		}
	});

	
	var accept_all = document.getElementById('accept-all');
	var reject_all = document.getElementById('reject-all');

	accept_all.addEventListener('click', function(){
		console.log("clicked accept-all");
		manager.acceptService('all');
	});

	reject_all.addEventListener('click', function(){
		console.log("clicked reject-all");
		manager.rejectService('all');
	});
