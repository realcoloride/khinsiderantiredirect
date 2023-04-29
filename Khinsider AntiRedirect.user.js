// ==UserScript==
// @name         Khinsider AntiRedirect
// @namespace    https://downloads.khinsider.com/game-soundtracks/*
// @version      0.21
// @description  Makes khinsider stop redirecting you when clicking download on a soundtrack. Also directly downloads the soundtracks instead of redirecting and includes a right click save as directly from the album's page.
// @author       realcoloride
// @license      MIT
// @match        https://downloads.khinsider.com/game-soundtracks/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=khinsider.com
// @updateURL    https://github.com/realcoloride/khinsiderantiredirect/raw/main/Khinsider%20AntiRedirect.user.js
// @downloadURL  https://github.com/realcoloride/khinsiderantiredirect/raw/main/Khinsider%20AntiRedirect.user.js
// @grant        none
// ==/UserScript==

(function() {
    const songlist = document.getElementById('songlist');
    let pass = true;

    let tbody;

    try {
        tbody = songlist.getElementsByTagName("tbody")[0];
    } catch (error) {pass = false;}

    if (!pass) return;

    const songElements = tbody.getElementsByTagName("tr");
    const excludedElements = [
        'songlist_header',
        'songlist_footer'
    ]

    function extractUrl(htmlString) {
        const regex = /<audio\s+id="audio"\s+.*?\bsrc="(.*?)"/;
        const match = regex.exec(htmlString);
        return match ? match[1] : null;
    }

    function inject(trackElement) {
        const playlistDownloadSong = trackElement.getElementsByClassName('playlistDownloadSong')[0];
        const hrefElement = playlistDownloadSong.getElementsByTagName('a')[0];

        const songLink = hrefElement.href;
        const eventListeners = hrefElement.eventListeners;

        // dispatch click event
        hrefElement.removeAttribute('href');

        hrefElement.style.cursor = 'pointer';
        hrefElement.setAttribute('alt', 'Download track');

        const xhr = new XMLHttpRequest();
        xhr.open("GET", songLink);
        xhr.send();
        xhr.responseType = "text";

        hrefElement.hidden = true;

        function finish(url) {
            hrefElement.setAttribute('href', url);
            hrefElement.setAttribute('download', '');

            hrefElement.addEventListener('click', function(event) {
                event.preventDefault();

                // create a temporary audio element
                const audio = document.createElement('audio');
                audio.src = url;

                // add the "preload" attribute to start loading the audio file
                audio.setAttribute('preload', 'auto');
                audio.type = 'audio/mpeg';

                // add an event listener for when the audio file is loaded
                audio.addEventListener('loadeddata', function() {
                    // create a temporary link element
                    const link = document.createElement('a');

                    // set the "href" attribute to the audio file's blob URL
                    link.href = URL.createObjectURL(new Blob([audio.src], { type: audio.type }));

                    // set the "download" attribute to force download
                    const filename = url.substring(url.lastIndexOf('/')+1).replace(/%20/g, " ");
                    link.setAttribute('download', filename);

                    // add the link to the document body
                    document.body.appendChild(link);

                    // trigger a click event on the link
                    link.click();

                    // remove the link and audio elements from the document body
                    document.body.removeChild(link);
                    document.body.removeChild(audio);
                });

                // add the audio element to the document body
                document.body.appendChild(audio);
            });

            hrefElement.hidden = false;
        }

        xhr.onload = () => {
            if (xhr.readyState == 4 && xhr.status == 200) {
                const body = xhr.response;
                const url = extractUrl(body);

                finish(url);
            } else console.log('Something errored with the request');
        }
    }

    for (let i = 0; i < songElements.length; i++) {
        const trackElement = songElements[i];
        let passing = true;

        for (let j = 0; j < excludedElements.length; j++) {
            if (excludedElements[j] == trackElement.id)
                passing = false;
        }

        if (passing) inject(trackElement);
    }
})();
