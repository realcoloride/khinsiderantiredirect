// ==UserScript==
// @name         Khinsider AntiRedirect
// @namespace    https://downloads.khinsider.com/game-soundtracks/*
// @version      0.3
// @description  Makes khinsider stop redirecting you when clicking download on a soundtrack. Also directly downloads the soundtracks instead of redirecting and includes a right click save as directly from the album's page.
// @author       realcoloride
// @license      MIT
// @match        https://downloads.khinsider.com/game-soundtracks/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=khinsider.com
// @updateURL    https://github.com/realcoloride/khinsiderantiredirect/raw/main/Khinsider%20AntiRedirect.user.js
// @downloadURL  https://github.com/realcoloride/khinsiderantiredirect/raw/main/Khinsider%20AntiRedirect.user.js
// @connect      vgmdownloads.com
// @connect      vgmsite.com
// @grant        GM.xmlHttpRequest
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

    function getButtonFromHref(hrefElement) {
        return hrefElement.querySelector("i");
    }

    async function downloadFile(button, url, filename) {
        setButtonToLoading(button);

        function finish() {
            setButtonToDownloadIcon(button);
            if (button.disabled) button.disabled = false
        }
 
        GM.xmlHttpRequest({
            method: 'GET',
            headers: {},
            url: url,
            responseType: 'blob',
            onload: async function(response) {
                if (response.status == 403) { 
                    alert("Download failed, please try again later or refresh the page."); 
                    return; 
                }
                
                const blob = response.response;
                const link = document.createElement('a');
 
                link.href = URL.createObjectURL(blob);
                link.setAttribute('download', filename);
                link.click();
 
                URL.revokeObjectURL(link.href);
                
                setButtonToDownloadIcon(button);
                button.disabled = false;

                finish();
            },
            onerror: function(error) {
                console.error('Download Error:', error);
                alert("Download failed, please try again later or refresh the page."); 
                
                finish();
            }
        });
    }

    let stylesInjected = false;


    function loadCSS(css) {
        const style = document.createElement('style');
        style.innerHTML = css;
        document.head.appendChild(style);
    }

    function injectStyles() {
        if (stylesInjected) return;
        stylesInjected = true;

        loadCSS(`
            @keyframes rotating {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
        }`);
    }

    function setButtonToLoading(button) {
        button.innerText = "loop";
        button.setAttribute("style", "animation: 2s linear infinite rotating");
    }
    function setButtonToDownloadIcon(button) {
        button.innerText = "get_app";
        button.setAttribute("style", "");
    }

    function inject(trackElement) {
        const playlistDownloadSong = trackElement.getElementsByClassName('playlistDownloadSong')[0];
        const hrefElement = playlistDownloadSong.getElementsByTagName('a')[0];

        const songLink = hrefElement.href;

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

            hrefElement.addEventListener('click', async function(event) {
                event.preventDefault();

                const filename = decodeURIComponent(url.substring(url.lastIndexOf('/')+1).replace(/%20/g, " "));
                await downloadFile(getButtonFromHref(hrefElement), url, filename);
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

    injectStyles();
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
