/*
 * ⚠️  REFERENCE ONLY - DO NOT COPY CODE PATTERNS ⚠️
 *
 * This file is for understanding UI behavior and logic concepts.
 * DO NOT use jQuery, Bootstrap JS, or vanilla DOM manipulation patterns.
 *
 * For React components, use:
 * - React hooks (useState, useEffect) instead of jQuery
 * - React event handlers instead of addEventListener
 * - React state instead of DOM manipulation
 * - TanStack Query instead of $.ajax
 * - CSS classes instead of JS animations
 *
 * Extract ONLY the business logic and UI concepts, then implement in React way.
 */

/*
	AUTHOR: Osvaldas Valutis, www.osvaldas.info
*/
;(($, window, document, undefined) => {
  const isTouch = "ontouchstart" in window
  const eStart = isTouch ? "touchstart" : "mousedown"
  const eMove = isTouch ? "touchmove" : "mousemove"
  const eEnd = isTouch ? "touchend" : "mouseup"
  const eCancel = isTouch ? "touchcancel" : "mouseup"
  const secondsToTime = (secs) => {
    const hours = Math.floor(secs / 3600)
    const minutes = Math.floor((secs % 3600) / 60)
    const seconds = Math.ceil((secs % 3600) % 60)
    return `${(hours === 0 ? "" : hours > 0 && hours.toString().length < 2 ? `0${hours}:` : `${hours}:`) + (minutes.toString().length < 2 ? `0${minutes}` : minutes)}:${seconds.toString().length < 2 ? `0${seconds}` : seconds}`
  }
  const canPlayType = (file) => {
    const audioElement = document.createElement("audio")
    return !!audioElement
      .canPlayType?.(`audio/${file.split(".").pop().toLowerCase()};`)
      .replace(/no/, "")
  }

  $.fn.audioPlayer = function (params) {
    const params = $.extend(
      {
        classPrefix: "audioplayer",
        strPlay: "",
        strPause: "",
        strVolume: "",
      },
      params,
    )
    const cssClass = {}
    const cssClassSub = {
      playPause: "playpause",
      playing: "playing",
      time: "time",
      timeCurrent: "time-current",
      timeDuration: "time-duration",
      bar: "bar",
      barLoaded: "bar-loaded",
      barPlayed: "bar-played",
      volume: "volume",
      volumeButton: "volume-button",
      volumeAdjust: "volume-adjust",
      noVolume: "novolume",
      mute: "mute",
      mini: "mini",
    }

    for (const subName in cssClassSub)
      cssClass[subName] = `${params.classPrefix}-${cssClassSub[subName]}`

    this.each(function () {
      if ($(this).prop("tagName").toLowerCase() !== "audio") return false

      const $this = $(this)
      let audioFile = $this.attr("src")
      const isAutoPlay = $this.get(0).getAttribute("autoplay")
      const isAutoPlay = !!(isAutoPlay === "" || isAutoPlay === "autoplay")
      const isLoop = $this.get(0).getAttribute("loop")
      const isLoop = !!(isLoop === "" || isLoop === "loop")
      let isSupport = false

      if (typeof audioFile === "undefined") {
        $this.find("source").each(function () {
          audioFile = $(this).attr("src")
          if (typeof audioFile !== "undefined" && canPlayType(audioFile)) {
            isSupport = true
            return false
          }
        })
      } else if (canPlayType(audioFile)) isSupport = true

      const thePlayer = $(
        `<div class="${params.classPrefix}">${isSupport ? $("<div>").append($this.eq(0).clone()).html() : `<embed src="${audioFile}" width="0" height="0" volume="100" autostart="${isAutoPlay.toString()}" loop="${isLoop.toString()}" />`}<div class="${cssClass.playPause}" title="${params.strPlay}"><a href="#">${params.strPlay}</a></div></div>`,
      )
      const theAudio = isSupport
        ? thePlayer.find("audio")
        : thePlayer.find("embed")
      const theAudio = theAudio.get(0)

      if (isSupport) {
        thePlayer.find("audio").css({
          width: 0,
          height: 0,
          visibility: "hidden",
        })
        thePlayer.append(
          `<div class="${cssClass.time} ${cssClass.timeCurrent}"></div><div class="${cssClass.bar}"><div class="${cssClass.barLoaded}"></div><div class="${cssClass.barPlayed}"></div></div><div class="${cssClass.time} ${cssClass.timeDuration}"></div><div class="${cssClass.volume}"><div class="${cssClass.volumeButton}" title="${params.strVolume}"><a href="#">${params.strVolume}</a></div><div class="${cssClass.volumeAdjust}"><div><div></div></div></div></div>`,
        )

        const theBar = thePlayer.find(`.${cssClass.bar}`)
        const barPlayed = thePlayer.find(`.${cssClass.barPlayed}`)
        const barLoaded = thePlayer.find(`.${cssClass.barLoaded}`)
        const timeCurrent = thePlayer.find(`.${cssClass.timeCurrent}`)
        const timeDuration = thePlayer.find(`.${cssClass.timeDuration}`)
        const volumeButton = thePlayer.find(`.${cssClass.volumeButton}`)
        const volumeAdjuster = thePlayer.find(`.${cssClass.volumeAdjust} > div`)
        let volumeDefault = 0
        const adjustCurrentTime = (e) => {
          theRealEvent = isTouch ? e.originalEvent.touches[0] : e
          theAudio.currentTime = Math.round(
            (theAudio.duration * (theRealEvent.pageX - theBar.offset().left)) /
              theBar.width(),
          )
        }
        const adjustVolume = (e) => {
          theRealEvent = isTouch ? e.originalEvent.touches[0] : e
          theAudio.volume = Math.abs(
            (theRealEvent.pageX - volumeAdjuster.offset().left) /
              volumeAdjuster.width(),
          )
        }
        const updateLoadBar = setInterval(() => {
          if (theAudio.buffered.length > 0) {
            barLoaded.width(
              `${(theAudio.buffered.end(0) / theAudio.duration) * 100}%`,
            )
            if (theAudio.buffered.end(0) >= theAudio.duration)
              clearInterval(updateLoadBar)
          }
        }, 100)

        const volumeTestDefault = theAudio.volume
        const volumeTestValue = (theAudio.volume = 0.111)
        if (Math.round(theAudio.volume * 1000) / 1000 === volumeTestValue)
          theAudio.volume = volumeTestDefault
        else thePlayer.addClass(cssClass.noVolume)

        timeDuration.html("&hellip;")
        timeCurrent.text(secondsToTime(0))

        theAudio.addEventListener("loadeddata", () => {
          timeDuration.text(secondsToTime(theAudio.duration))
          volumeAdjuster.find("div").width(`${theAudio.volume * 100}%`)
          volumeDefault = theAudio.volume
        })

        theAudio.addEventListener("timeupdate", () => {
          timeCurrent.text(secondsToTime(theAudio.currentTime))
          barPlayed.width(
            `${(theAudio.currentTime / theAudio.duration) * 100}%`,
          )
        })

        theAudio.addEventListener("volumechange", () => {
          volumeAdjuster.find("div").width(`${theAudio.volume * 100}%`)
          if (theAudio.volume > 0 && thePlayer.hasClass(cssClass.mute))
            thePlayer.removeClass(cssClass.mute)
          if (theAudio.volume <= 0 && !thePlayer.hasClass(cssClass.mute))
            thePlayer.addClass(cssClass.mute)
        })

        theAudio.addEventListener("ended", () => {
          thePlayer.removeClass(cssClass.playing)
        })

        theBar
          .on(eStart, (e) => {
            adjustCurrentTime(e)
            theBar.on(eMove, (e) => {
              adjustCurrentTime(e)
            })
          })
          .on(eCancel, () => {
            theBar.unbind(eMove)
          })

        volumeButton.on("click", () => {
          if (thePlayer.hasClass(cssClass.mute)) {
            thePlayer.removeClass(cssClass.mute)
            theAudio.volume = volumeDefault
          } else {
            thePlayer.addClass(cssClass.mute)
            volumeDefault = theAudio.volume
            theAudio.volume = 0
          }
          return false
        })

        volumeAdjuster
          .on(eStart, (e) => {
            adjustVolume(e)
            volumeAdjuster.on(eMove, (e) => {
              adjustVolume(e)
            })
          })
          .on(eCancel, () => {
            volumeAdjuster.unbind(eMove)
          })
      } else thePlayer.addClass(cssClass.mini)

      if (isAutoPlay) thePlayer.addClass(cssClass.playing)

      thePlayer.find(`.${cssClass.playPause}`).on("click", function () {
        if (thePlayer.hasClass(cssClass.playing)) {
          $(this).attr("title", params.strPlay).find("a").html(params.strPlay)
          thePlayer.removeClass(cssClass.playing)
          isSupport ? theAudio.pause() : theAudio.Stop()
        } else {
          $(this).attr("title", params.strPause).find("a").html(params.strPause)
          thePlayer.addClass(cssClass.playing)
          isSupport ? theAudio.play() : theAudio.Play()
        }
        return false
      })

      $this.replaceWith(thePlayer)
    })
    return this
  }
})(jQuery, window, document)
