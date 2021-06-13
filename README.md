<h1 align="center">
  <img src="./demo/assets/iframemanager_logo.svg" height="100px" alt="IframeManager Logo" />
</h1>

<div align="center">

[Demo](https://orestbida.com/demo-projects/iframemanager/demo1/)&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;[Features](#features)&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;[Installation](#installation)&nbsp;&nbsp;&nbsp;

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
![Size](https://img.shields.io/github/size/orestbida/iframemanager/dist/iframemanager.js)
[![Stable version](https://img.shields.io/github/v/release/orestbida/iframemanager)](https://github.com/orestbida/iframemanager/releases)
</div>
<div align="center">

**IframeMananger** is a lightweight javascript plugin which helps you **comply with `GDPR`** by completely removing iframes initially and setting a notice relative to that service. **Iframes are loaded only after consent**. 

<sub>
<i>

The plugin was mainly developed to aid [**CookieConsent**](https://github.com/orestbida/cookieconsent) with iframe management.
</i>
</sub>

</div>

<br>

## Table of Contents

- [**Key features**](#features)
- [**Installation**](#installation)
- [**Configuration options & API**](#configuration-options)
- [**Configuration examples**](#configuration-examples)
    - How to embed youtube video
    - How to embed dailymotion video
    - How to embed vimeo video
    - How to embed twitch channel/chat
- [**License**](#license)

## Features
- Lightweight
- Complies with **GDPR**
- **Multilanguage** support
- Automatic/custom thumbnail [support *](#note)
- Allows to integrate any service which uses iframes
- Improves website **performance**:
  - no `<iframe>` tags on first page load
  - lazyloads thumbnails
  - lazyloads iframes
- Can be integrated with any cookie consent solution

## Installation
1. #### Download the [latest release]() or use via CDN:

    ```bash
    https://cdn.jsdelivr.net/gh/orestbida/iframemanager@v1.0/dist/iframemanager.js
    https://cdn.jsdelivr.net/gh/orestbida/iframemanager@v1.0/dist/iframemanager.css
    ```

2. #### Import script + stylesheet:

    ```html
    <html>
      <head>
        ...
        <link rel="stylesheet" href="iframemanager.css">
      </head>
      <body>
        ...
        <script src="iframemanager.js" defer></script>
      <body>
    </html>
    ```

3. #### Configure and run:
    -   <details><summary>As external script</summary>
        <p>

        - Create a .js file (e.g. `app.js`) and import it in your html markup:
    
            ```html
            <body>
                ...
                <script src="iframemanager.js" defer></script>
                <script src="app.js" defer></script>
            <body>
            ```

        - Configure iframemanager inside `app.js`:
        
            ```javascript
            (function(){
            
                var manager = iframemanager();
                
                // Example with youtube embed
                manager.run({
                    currLang: 'en',
                    services : {
                        youtube : {
                            embedUrl: 'https://www.youtube-nocookie.com/embed/{data-id}',
                            thumbnailUrl: 'https://i3.ytimg.com/vi/{data-id}/hqdefault.jpg',
                            iframe : {
                                allow : 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen;',
                            },
                            cookie : {
                                name : 'cc_youtube'
                            },
                            languages : {
                                en : {
                                    notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer" href="https://www.youtube.com/t/terms" title="Terms and conditions" target="_blank">terms and conditions</a> of youtube.com.',
                                    loadBtn: 'Load video',
                                    loadAllBtn: 'Don\'t ask again'
                                }
                            }
                        }
                    }
                });
            })();
            ```
        </p>
        </details>
    -   <details><summary>As inline script</summary>
        <p>

        ```html
        <body>
          ...
          <script src="iframemanager.js" defer></script>

          <!-- Inline script -->
          <script>
            window.addEventListener('load', function(){
                
                var manager = iframemanager();
                
                // Example with youtube embed
                manager.run({
                    currLang: 'en',
                    services : {
                        youtube : {
                            embedUrl: 'https://www.youtube-nocookie.com/embed/{data-id}',
                            thumbnailUrl: 'https://i3.ytimg.com/vi/{data-id}/hqdefault.jpg',
                            iframe : {
                                allow : 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen;',
                            },
                            cookie : {
                                name : 'cc_youtube'
                            },
                            languages : {
                                en : {
                                    notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer" href="https://www.youtube.com/t/terms" title="Terms and conditions" target="_blank">terms and conditions</a> of youtube.com.',
                                    loadBtn: 'Load video',
                                    loadAllBtn: 'Don\'t ask again'
                                }
                            }
                        }
                    }
                });
            });
          </script>
        <body>
        ```
      </p>
    </details>

4. #### Create a div (will contain the iframe) with `data-service` and `data-id` attributes:

    ```html
    <div data-service="youtube" data-id="<video-id>"></div>
    ```

## Configuration options
All available options for  the `<div>` element:
```html
<div
    data-service="<service-name>"	
    data-id="<resource-id>"
    data-params="<iframe-query-parameters>"
    data-thumbnail="<path-to-image>" 
    data-autoscale>
</div>
```

- `data-service` :      [String, Required] name of the service (must also be defined in the config. object)
- `data-id` :           [String, Required] unique id of the resource (example: video id)
- `data-params` :       [String] iframe query parameters
- `data-thumbnail` :    [String] path to custom thumbnail
- `data-autoscale` :    specify for **responsive iframe** (fill parent width + scale proportionally)

<br>

All available options for the config. object:
```javascript
{
    currLang: 'en',     // current language of the notice (must also be defined in the "languages" object below)
    autoLang: false,    // if enabled => use current client's browser language 
                        // instead of currLang [OPTIONAL]

    services : {
        myservice : {

            embedUrl: 'https://myservice_embed_url>/{data-id}',

            // set valid url for automatic thumbnails   [OPTIONAL]
            thumbnailUrl: 'https://<myservice_embed_thumbnail_url>/{data-id}',	

            // global iframe settings (apply to all iframes relative to current service) [OPTIONAL]
            iframe : {
                allow : 'fullscreen',           // iframe's allow attribute
                params : 'mute=1&start=21'      // iframe's url query parameters

                // function run for each iframe configured with current service
                onload : function(data_id, callback){
                    console.log("loaded iframe with data-id=" + data_id);
                }
            },

            // cookie is set if the current service is accepted
            cookie : {
                name : 'cc_youtube',            // cookie name
                path : '/',                     // cookie path          [OPTIONAL]
                samesite : 'lax',               // cookie samesite      [OPTIONAL]
                domain : location.hostname      // cookie domain        [OPTIONAL]
            },

            languages : {
                en : {
                    notice: 'Html <b>notice</b> message',
                    loadBtn: 'Load video',          // Load only current iframe
                    loadAllBtn: 'Don\'t ask again'  // Load all iframes configured with this service + set cookie		
                }
            }
        },

        anotherservice : {
            ...
        }
    }
}
```

Note: `thumbnailUrl` can be static string, dynamic string or a function:

- `static string` : "https://path_to_image/image.png"
- `dynamic string` : "https://myservice_embed_url/{data-id}"
- `function` :
    ```javascript
    ...
    thumbnailUrl : function(data_id, callback){
        // fetch thumbnail url here based on data_id of the current element ...
        var url = 'fetched_url';

        // pass obtained url to the callback function
        callback(url);
    },
    ...
    ```

## APIs
The plugin exposes 3 main methods:
- `.run(<config_object>)`
- `.acceptService(<service_name>)`
- `.rejectService(<service_name>)`

Example usage:

```javascript
// accept specific service only
manager.acceptService('youtube');

// accept all services (for example if user has given full consent to cookies)
manager.acceptService('all');

// reject specific service
manager.rejectService('youtube');

// reject all services (for example when user opts out of cookies)
manager.rejectService('all');
```

Both `acceptService` and `rejectService` work the same way:
1. set/erase cookie
2. create/remove iframes

## Configuration examples
-   <details><summary>How to embed youtube videos</summary>
    <p>

    ```javascript
    // Example with youtube embed
    manager.run({
        currLang: 'en',
        services : {
            youtube : {
                embedUrl: 'https://www.youtube-nocookie.com/embed/{data-id}',
                thumbnailUrl: 'https://i3.ytimg.com/vi/{data-id}/hqdefault.jpg',
                iframe : {
                    allow : 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen;',
                },
                cookie : {
                    name : 'cc_youtube'
                },
                languages : {
                    en : {
                        notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer" href="https://www.youtube.com/t/terms" title="Terms and conditions" target="_blank">terms and conditions</a> of youtube.com.',
                        loadBtn: 'Load video',
                        loadAllBtn: 'Don\'t ask again'
                    }
                }
            }
        }
    });
    ```
    </p>
    </details>
-   <details><summary>How to embed dailymotion videos</summary>
    <p>

    ```javascript
    // Example with youtube embed
    manager.run({
        currLang: 'en',
        services : {
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
					allow : 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen;',
				},
				cookie : {						
					name : 'cc_dailymotion'
				},
				languages : {
					'en' : {
						notice: 'This content is hosted by a third party. By showing the external content you accept the <a rel="noreferrer" href="https://www.dailymotion.com/legal/privacy?localization=en" title="Terms and conditions" target="_blank">terms and conditions</a> of dailymotion.com.',
						loadBtn: 'Load video',
						loadAllBtn: 'Don\'t ask again'
						
					}
				}
			}
        }
    });
    ```
    </p>
    </details>


## License
Distributed under the MIT License. See [LICENSE](https://github.com/orestbida/iframemanager/blob/master/LICENSE) for more information.

<br>

#### Note
<i>Not all services (example: twitch) allow automatic/easy thumbnail fetch.</i>
