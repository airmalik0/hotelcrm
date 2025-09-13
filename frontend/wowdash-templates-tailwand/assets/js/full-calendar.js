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

$(document).ready(() => {
  const date = new Date()
  const d = date.getDate()
  const m = date.getMonth()
  const y = date.getFullYear()
  /*  className colors
		className: default(transparent), important(red), chill(pink), success(green), info(blue)
		*/
  /* initialize the external events
		-----------------------------------------------------------------*/
  $("#external-events div.external-event").each(function () {
    // create an Event Object (http://arshaw.com/fullcalendar/docs/event_data/Event_Object/)
    // it doesn't need to have a start or end
    const eventObject = {
      title: $.trim($(this).text()), // use the element's text as the event title
    }
    // store the Event Object in the DOM element so we can get to it later
    $(this).data("eventObject", eventObject)
    // make the event draggable using jQuery UI
    $(this).draggable({
      zIndex: 999,
      revert: true, // will cause the event to go back to its
      revertDuration: 0, //  original position after the drag
    })
  })
  /************** initialize the calendar *********************
		-----------------------------------------------------------------*/
  const calendar = $("#calendar").fullCalendar({
    header: {
      left: "title",
      center: "agendaDay,agendaWeek,month",
      right: "prev,next today",
    },
    editable: true,
    firstDay: 1, //  1(Monday) this can be changed to 0(Sunday) for the USA system
    selectable: true,
    defaultView: "month",
    axisFormat: "h:mm",
    columnFormat: {
      month: "ddd", // Mon
      week: "ddd d", // Mon 7
      day: "dddd M/d", // Monday 9/7
      agendaDay: "dddd d",
    },
    titleFormat: {
      month: "MMMM yyyy", // September 2009
      week: "MMMM yyyy", // September 2009
      day: "MMMM yyyy", // Tuesday, Sep 8, 2009
    },
    allDaySlot: false, //cambie a true
    selectHelper: true,
    dayClick: (date, allDay, jsEvent, view) => {
      if (allDay) {
        // Clicked on the day number
        calendar
          .fullCalendar("changeView", "agendaDay" /* or 'basicDay' */)
          .fullCalendar(
            "gotoDate",
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
          )
      }
    },
    droppable: true, // this allows things to be dropped onto the calendar !!!
    drop: function (date, allDay) {
      // this function is called when something is dropped

      // retrieve the dropped element's stored Event Object
      const originalEventObject = $(this).data("eventObject")

      // we need to copy it, so that multiple events don't have a reference to the same object
      const copiedEventObject = $.extend({}, originalEventObject)

      // assign it the date that was reported
      copiedEventObject.start = date
      copiedEventObject.allDay = allDay

      // render the event on the calendar
      // the last `true` argument determines if the event "sticks" (http://arshaw.com/fullcalendar/docs/event_rendering/renderEvent/)
      $("#calendar").fullCalendar("renderEvent", copiedEventObject, true)

      // is the "remove after drop" checkbox checked?
      if ($("#drop-remove").is(":checked")) {
        // if so, remove the element from the "Draggable Events" list
        $(this).remove()
      }
    },

    events: [
      {
        title: "All Day Event",
        start: new Date(y, m, 1),
      },
      {
        id: 999,
        title: "Repeating Event",
        start: new Date(y, m, d - 3, 16, 0),
        allDay: false,
        className: "info",
      },
      {
        id: 999,
        title: "Repeating Event",
        start: new Date(y, m, d + 4, 16, 0),
        allDay: false,
        className: "info",
      },
      {
        title: "Meeting",
        start: new Date(y, m, d, 10, 30),
        allDay: false,
        className: "important",
      },
      {
        title: "Lunch",
        start: new Date(y, m, d, 12, 0),
        end: new Date(y, m, d, 14, 0),
        allDay: false,
        className: "important",
      },
      {
        title: "Birthday Party",
        start: new Date(y, m, d + 1, 19, 0),
        end: new Date(y, m, d + 1, 22, 30),
        allDay: false,
      },
      {
        title: "Click for Google",
        start: new Date(y, m, 28),
        end: new Date(y, m, 29),
        url: "http://google.com/",
        className: "success",
      },
    ],
  })
})
/*!
 * FullCalendar v1.6.4
 * Docs & License: http://arshaw.com/fullcalendar/
 * (c) 2013 Adam Shaw
 */

/*
 * Use fullcalendar.css for basic styling.
 * For event drag & drop, requires jQuery UI draggable.
 * For event resizing, requires jQuery UI resizable.
 */
;(($, undefined) => {
  const defaults = {
    // display
    defaultView: "month",
    aspectRatio: 1.35,
    header: {
      left: "title",
      center: "",
      right: "today prev,next",
    },
    weekends: true,
    weekNumbers: false,
    weekNumberCalculation: "iso",
    weekNumberTitle: "W",

    // editing
    //editable: false,
    //disableDragging: false,
    //disableResizing: false,

    allDayDefault: true,
    ignoreTimezone: true,

    // event ajax
    lazyFetching: true,
    startParam: "start",
    endParam: "end",

    // time formats
    titleFormat: {
      month: "MMMM yyyy",
      week: "MMM d[ yyyy]{ '&#8212;'[ MMM] d yyyy}",
      day: "dddd, MMM d, yyyy",
    },
    columnFormat: {
      month: "ddd",
      week: "ddd M/d",
      day: "dddd M/d",
    },
    timeFormat: {
      // for event elements
      "": "h(:mm)t", // default
    },

    // locale
    isRTL: false,
    firstDay: 0,
    monthNames: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    monthNamesShort: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    dayNames: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    buttonText: {
      prev: "<span class='fc-text-arrow'>&lsaquo;</span>",
      next: "<span class='fc-text-arrow'>&rsaquo;</span>",
      prevYear: "<span class='fc-text-arrow'>&laquo;</span>",
      nextYear: "<span class='fc-text-arrow'>&raquo;</span>",
      today: "today",
      month: "month",
      week: "week",
      day: "day",
    },

    // jquery-ui theming
    theme: false,
    buttonIcons: {
      prev: "circle-triangle-w",
      next: "circle-triangle-e",
    },

    //selectable: false,
    unselectAuto: true,

    dropAccept: "*",

    handleWindowResize: true,
  }

  // right-to-left defaults
  const rtlDefaults = {
    header: {
      left: "next,prev today",
      center: "",
      right: "title",
    },
    buttonText: {
      prev: "<span class='fc-text-arrow'>&rsaquo;</span>",
      next: "<span class='fc-text-arrow'>&lsaquo;</span>",
      prevYear: "<span class='fc-text-arrow'>&raquo;</span>",
      nextYear: "<span class='fc-text-arrow'>&laquo;</span>",
    },
    buttonIcons: {
      prev: "circle-triangle-e",
      next: "circle-triangle-w",
    },
  }

  const fc = ($.fullCalendar = { version: "1.6.4" })
  const fcViews = (fc.views = {})

  $.fn.fullCalendar = function (options) {
    // method calling
    if (typeof options === "string") {
      const args = Array.prototype.slice.call(arguments, 1)
      let res
      this.each(function () {
        const calendar = $.data(this, "fullCalendar")
        if (calendar && $.isFunction(calendar[options])) {
          const r = calendar[options].apply(calendar, args)
          if (res === undefined) {
            res = r
          }
          if (options === "destroy") {
            $.removeData(this, "fullCalendar")
          }
        }
      })
      if (res !== undefined) {
        return res
      }
      return this
    }

    options = options || {}

    // would like to have this logic in EventManager, but needs to happen before options are recursively extended
    const eventSources = options.eventSources || []
    options.eventSources = undefined
    if (options.events) {
      eventSources.push(options.events)
      options.events = undefined
    }

    options = $.extend(
      true,
      {},
      defaults,
      options.isRTL || (options.isRTL === undefined && defaults.isRTL)
        ? rtlDefaults
        : {},
      options,
    )

    this.each((i, _element) => {
      const element = $(_element)
      const calendar = new Calendar(element, options, eventSources)
      element.data("fullCalendar", calendar) // TODO: look into memory leak implications
      calendar.render()
    })

    return this
  }

  // function for adding/overriding defaults
  function setDefaults(d) {
    $.extend(true, defaults, d)
  }

  function Calendar(element, options, eventSources) {
    const t = this

    // exports
    t.options = options
    t.render = render
    t.destroy = destroy
    t.refetchEvents = refetchEvents
    t.reportEvents = reportEvents
    t.reportEventChange = reportEventChange
    t.rerenderEvents = rerenderEvents
    t.changeView = changeView
    t.select = select
    t.unselect = unselect
    t.prev = prev
    t.next = next
    t.prevYear = prevYear
    t.nextYear = nextYear
    t.today = today
    t.gotoDate = gotoDate
    t.incrementDate = incrementDate
    t.formatDate = (format, date) => formatDate(format, date, options)
    t.formatDates = (format, date1, date2) =>
      formatDates(format, date1, date2, options)
    t.getDate = getDate
    t.getView = getView
    t.option = option
    t.trigger = trigger

    // imports
    EventManager.call(t, options, eventSources)
    const isFetchNeeded = t.isFetchNeeded
    const fetchEvents = t.fetchEvents

    // locals
    const _element = element[0]
    let header
    let headerElement
    let content
    let tm // for making theme classes
    let currentView
    let elementOuterWidth
    let suggestedViewHeight
    let resizeUID = 0
    let ignoreWindowResize = 0
    let date = new Date()
    let events = []
    let _dragElement

    /* Main Rendering
	-----------------------------------------------------------------------------*/

    setYMD(date, options.year, options.month, options.date)

    function render(inc) {
      if (!content) {
        initialRender()
      } else if (elementVisible()) {
        // mainly for the public API
        calcSize()
        _renderView(inc)
      }
    }

    function initialRender() {
      tm = options.theme ? "ui" : "fc"
      element.addClass("fc")
      if (options.isRTL) {
        element.addClass("fc-rtl")
      } else {
        element.addClass("fc-ltr")
      }
      if (options.theme) {
        element.addClass("ui-widget")
      }

      content = $(
        "<div class='fc-content' style='position:relative'/>",
      ).prependTo(element)

      header = new Header(t, options)
      headerElement = header.render()
      if (headerElement) {
        element.prepend(headerElement)
      }

      changeView(options.defaultView)

      if (options.handleWindowResize) {
        $(window).resize(windowResize)
      }

      // needed for IE in a 0x0 iframe, b/c when it is resized, never triggers a windowResize
      if (!bodyVisible()) {
        lateRender()
      }
    }

    // called when we know the calendar couldn't be rendered when it was initialized,
    // but we think it's ready now
    function lateRender() {
      setTimeout(() => {
        // IE7 needs this so dimensions are calculated correctly
        if (!currentView.start && bodyVisible()) {
          // !currentView.start makes sure this never happens more than once
          renderView()
        }
      }, 0)
    }

    function destroy() {
      if (currentView) {
        trigger("viewDestroy", currentView, currentView, currentView.element)
        currentView.triggerEventDestroy()
      }

      $(window).unbind("resize", windowResize)

      header.destroy()
      content.remove()
      element.removeClass("fc fc-rtl ui-widget")
    }

    function elementVisible() {
      return element.is(":visible")
    }

    function bodyVisible() {
      return $("body").is(":visible")
    }

    /* View Rendering
	-----------------------------------------------------------------------------*/

    function changeView(newViewName) {
      if (!currentView || newViewName !== currentView.name) {
        _changeView(newViewName)
      }
    }

    function _changeView(newViewName) {
      ignoreWindowResize++

      if (currentView) {
        trigger("viewDestroy", currentView, currentView, currentView.element)
        unselect()
        currentView.triggerEventDestroy() // trigger 'eventDestroy' for each event
        freezeContentHeight()
        currentView.element.remove()
        header.deactivateButton(currentView.name)
      }

      header.activateButton(newViewName)

      currentView = new fcViews[newViewName](
        $(
          `<div class='fc-view fc-view-${newViewName}' style='position:relative'/>`,
        ).appendTo(content),
        t, // the calendar object
      )

      renderView()
      unfreezeContentHeight()

      ignoreWindowResize--
    }

    function renderView(inc) {
      if (
        !currentView.start || // never rendered before
        inc ||
        date < currentView.start ||
        date >= currentView.end // or new date range
      ) {
        if (elementVisible()) {
          _renderView(inc)
        }
      }
    }

    function _renderView(inc) {
      // assumes elementVisible
      ignoreWindowResize++

      if (currentView.start) {
        // already been rendered?
        trigger("viewDestroy", currentView, currentView, currentView.element)
        unselect()
        clearEvents()
      }

      freezeContentHeight()
      currentView.render(date, inc || 0) // the view's render method ONLY renders the skeleton, nothing else
      setSize()
      unfreezeContentHeight()
      ;(currentView.afterRender || noop)()

      updateTitle()
      updateTodayButton()

      trigger("viewRender", currentView, currentView, currentView.element)
      currentView.trigger("viewDisplay", _element) // deprecated

      ignoreWindowResize--

      getAndRenderEvents()
    }

    /* Resizing
	-----------------------------------------------------------------------------*/

    function updateSize() {
      if (elementVisible()) {
        unselect()
        clearEvents()
        calcSize()
        setSize()
        renderEvents()
      }
    }

    function calcSize() {
      // assumes elementVisible
      if (options.contentHeight) {
        suggestedViewHeight = options.contentHeight
      } else if (options.height) {
        suggestedViewHeight =
          options.height -
          (headerElement ? headerElement.height() : 0) -
          vsides(content)
      } else {
        suggestedViewHeight = Math.round(
          content.width() / Math.max(options.aspectRatio, 0.5),
        )
      }
    }

    function setSize() {
      // assumes elementVisible

      if (suggestedViewHeight === undefined) {
        calcSize() // for first time
        // NOTE: we don't want to recalculate on every renderView because
        // it could result in oscillating heights due to scrollbars.
      }

      ignoreWindowResize++
      currentView.setHeight(suggestedViewHeight)
      currentView.setWidth(content.width())
      ignoreWindowResize--

      elementOuterWidth = element.outerWidth()
    }

    function windowResize() {
      if (!ignoreWindowResize) {
        if (currentView.start) {
          // view has already been rendered
          const uid = ++resizeUID
          setTimeout(() => {
            // add a delay
            if (uid === resizeUID && !ignoreWindowResize && elementVisible()) {
              if (
                elementOuterWidth !== (elementOuterWidth = element.outerWidth())
              ) {
                ignoreWindowResize++ // in case the windowResize callback changes the height
                updateSize()
                currentView.trigger("windowResize", _element)
                ignoreWindowResize--
              }
            }
          }, 200)
        } else {
          // calendar must have been initialized in a 0x0 iframe that has just been resized
          lateRender()
        }
      }
    }

    /* Event Fetching/Rendering
	-----------------------------------------------------------------------------*/
    // TODO: going forward, most of this stuff should be directly handled by the view

    function refetchEvents() {
      // can be called as an API method
      clearEvents()
      fetchAndRenderEvents()
    }

    function rerenderEvents(modifiedEventID) {
      // can be called as an API method
      clearEvents()
      renderEvents(modifiedEventID)
    }

    function renderEvents(modifiedEventID) {
      // TODO: remove modifiedEventID hack
      if (elementVisible()) {
        currentView.setEventData(events) // for View.js, TODO: unify with renderEvents
        currentView.renderEvents(events, modifiedEventID) // actually render the DOM elements
        currentView.trigger("eventAfterAllRender")
      }
    }

    function clearEvents() {
      currentView.triggerEventDestroy() // trigger 'eventDestroy' for each event
      currentView.clearEvents() // actually remove the DOM elements
      currentView.clearEventData() // for View.js, TODO: unify with clearEvents
    }

    function getAndRenderEvents() {
      if (
        !options.lazyFetching ||
        isFetchNeeded(currentView.visStart, currentView.visEnd)
      ) {
        fetchAndRenderEvents()
      } else {
        renderEvents()
      }
    }

    function fetchAndRenderEvents() {
      fetchEvents(currentView.visStart, currentView.visEnd)
      // ... will call reportEvents
      // ... which will call renderEvents
    }

    // called when event data arrives
    function reportEvents(_events) {
      events = _events
      renderEvents()
    }

    // called when a single event's data has been changed
    function reportEventChange(eventID) {
      rerenderEvents(eventID)
    }

    /* Header Updating
	-----------------------------------------------------------------------------*/

    function updateTitle() {
      header.updateTitle(currentView.title)
    }

    function updateTodayButton() {
      const today = new Date()
      if (today >= currentView.start && today < currentView.end) {
        header.disableButton("today")
      } else {
        header.enableButton("today")
      }
    }

    /* Selection
	-----------------------------------------------------------------------------*/

    function select(start, end, allDay) {
      currentView.select(start, end, allDay === undefined ? true : allDay)
    }

    function unselect() {
      // safe to be called before renderView
      if (currentView) {
        currentView.unselect()
      }
    }

    /* Date
	-----------------------------------------------------------------------------*/

    function prev() {
      renderView(-1)
    }

    function next() {
      renderView(1)
    }

    function prevYear() {
      addYears(date, -1)
      renderView()
    }

    function nextYear() {
      addYears(date, 1)
      renderView()
    }

    function today() {
      date = new Date()
      renderView()
    }

    function gotoDate(year, month, dateOfMonth) {
      if (year instanceof Date) {
        date = cloneDate(year) // provided 1 argument, a Date
      } else {
        setYMD(date, year, month, dateOfMonth)
      }
      renderView()
    }

    function incrementDate(years, months, days) {
      if (years !== undefined) {
        addYears(date, years)
      }
      if (months !== undefined) {
        addMonths(date, months)
      }
      if (days !== undefined) {
        addDays(date, days)
      }
      renderView()
    }

    function getDate() {
      return cloneDate(date)
    }

    /* Height "Freezing"
	-----------------------------------------------------------------------------*/

    function freezeContentHeight() {
      content.css({
        width: "100%",
        height: content.height(),
        overflow: "hidden",
      })
    }

    function unfreezeContentHeight() {
      content.css({
        width: "",
        height: "",
        overflow: "",
      })
    }

    /* Misc
	-----------------------------------------------------------------------------*/

    function getView() {
      return currentView
    }

    function option(name, value) {
      if (value === undefined) {
        return options[name]
      }
      if (
        name === "height" ||
        name === "contentHeight" ||
        name === "aspectRatio"
      ) {
        options[name] = value
        updateSize()
      }
    }

    function trigger(name, thisObj) {
      if (options[name]) {
        return options[name].apply(
          thisObj || _element,
          Array.prototype.slice.call(arguments, 2),
        )
      }
    }

    /* External Dragging
	------------------------------------------------------------------------*/

    if (options.droppable) {
      $(document)
        .bind("dragstart", (ev, ui) => {
          const _e = ev.target
          const e = $(_e)
          if (!e.parents(".fc").length) {
            // not already inside a calendar
            const accept = options.dropAccept
            if ($.isFunction(accept) ? accept.call(_e, e) : e.is(accept)) {
              _dragElement = _e
              currentView.dragStart(_dragElement, ev, ui)
            }
          }
        })
        .bind("dragstop", (ev, ui) => {
          if (_dragElement) {
            currentView.dragStop(_dragElement, ev, ui)
            _dragElement = null
          }
        })
    }
  }

  function Header(calendar, options) {
    // exports
    this.render = render
    this.destroy = destroy
    this.updateTitle = updateTitle
    this.activateButton = activateButton
    this.deactivateButton = deactivateButton
    this.disableButton = disableButton
    this.enableButton = enableButton

    // locals
    let element = $([])
    let tm

    function render() {
      tm = options.theme ? "ui" : "fc"
      const sections = options.header
      if (sections) {
        element = $("<table class='fc-header' style='width:100%'/>").append(
          $("<tr/>")
            .append(renderSection("left"))
            .append(renderSection("center"))
            .append(renderSection("right")),
        )
        return element
      }
    }

    function destroy() {
      element.remove()
    }

    function renderSection(position) {
      const e = $(`<td class='fc-header-${position}'/>`)
      const buttonStr = options.header[position]
      if (buttonStr) {
        $.each(buttonStr.split(" "), function (i) {
          if (i > 0) {
            e.append("<span class='fc-header-space'/>")
          }
          let prevButton
          $.each(this.split(","), (j, buttonName) => {
            if (buttonName === "title") {
              e.append("<span class='fc-header-title'><h2>&nbsp;</h2></span>")
              if (prevButton) {
                prevButton.addClass(`${tm}-corner-right`)
              }
              prevButton = null
            } else {
              let buttonClick
              if (calendar[buttonName]) {
                buttonClick = calendar[buttonName] // calendar method
              } else if (fcViews[buttonName]) {
                buttonClick = () => {
                  button.removeClass(`${tm}-state-hover`) // forget why
                  calendar.changeView(buttonName)
                }
              }
              if (buttonClick) {
                const icon = options.theme
                  ? smartProperty(options.buttonIcons, buttonName)
                  : null // why are we using smartProperty here?
                const text = smartProperty(options.buttonText, buttonName) // why are we using smartProperty here?
                const button = $(
                  `<span class='fc-button fc-button-${buttonName} ${tm}-state-default'>${
                    icon
                      ? `<span class='fc-icon-wrap'><span class='ui-icon ui-icon-${icon}'/></span>`
                      : text
                  }</span>`,
                )
                  .click(() => {
                    if (!button.hasClass(`${tm}-state-disabled`)) {
                      buttonClick()
                    }
                  })
                  .mousedown(() => {
                    button
                      .not(`.${tm}-state-active`)
                      .not(`.${tm}-state-disabled`)
                      .addClass(`${tm}-state-down`)
                  })
                  .mouseup(() => {
                    button.removeClass(`${tm}-state-down`)
                  })
                  .hover(
                    () => {
                      button
                        .not(`.${tm}-state-active`)
                        .not(`.${tm}-state-disabled`)
                        .addClass(`${tm}-state-hover`)
                    },
                    () => {
                      button
                        .removeClass(`${tm}-state-hover`)
                        .removeClass(`${tm}-state-down`)
                    },
                  )
                  .appendTo(e)
                disableTextSelection(button)
                if (!prevButton) {
                  button.addClass(`${tm}-corner-left`)
                }
                prevButton = button
              }
            }
          })
          if (prevButton) {
            prevButton.addClass(`${tm}-corner-right`)
          }
        })
      }
      return e
    }

    function updateTitle(html) {
      element.find("h2").html(html)
    }

    function activateButton(buttonName) {
      element
        .find(`span.fc-button-${buttonName}`)
        .addClass(`${tm}-state-active`)
    }

    function deactivateButton(buttonName) {
      element
        .find(`span.fc-button-${buttonName}`)
        .removeClass(`${tm}-state-active`)
    }

    function disableButton(buttonName) {
      element
        .find(`span.fc-button-${buttonName}`)
        .addClass(`${tm}-state-disabled`)
    }

    function enableButton(buttonName) {
      element
        .find(`span.fc-button-${buttonName}`)
        .removeClass(`${tm}-state-disabled`)
    }
  }

  fc.sourceNormalizers = []
  fc.sourceFetchers = []

  const ajaxDefaults = {
    dataType: "json",
    cache: false,
  }

  let eventGUID = 1

  function EventManager(options, _sources) {
    // exports
    this.isFetchNeeded = isFetchNeeded
    this.fetchEvents = fetchEvents
    this.addEventSource = addEventSource
    this.removeEventSource = removeEventSource
    this.updateEvent = updateEvent
    this.renderEvent = renderEvent
    this.removeEvents = removeEvents
    this.clientEvents = clientEvents
    this.normalizeEvent = normalizeEvent

    // imports
    const trigger = this.trigger
    const getView = this.getView
    const reportEvents = this.reportEvents

    // locals
    const stickySource = { events: [] }
    let sources = [stickySource]
    let rangeStart
    let rangeEnd
    let currentFetchID = 0
    let pendingSourceCnt = 0
    let loadingLevel = 0
    let cache = []

    for (let i = 0; i < _sources.length; i++) {
      _addEventSource(_sources[i])
    }

    /* Fetching
	-----------------------------------------------------------------------------*/

    function isFetchNeeded(start, end) {
      return !rangeStart || start < rangeStart || end > rangeEnd
    }

    function fetchEvents(start, end) {
      rangeStart = start
      rangeEnd = end
      cache = []
      const fetchID = ++currentFetchID
      const len = sources.length
      pendingSourceCnt = len
      for (let i = 0; i < len; i++) {
        fetchEventSource(sources[i], fetchID)
      }
    }

    function fetchEventSource(source, fetchID) {
      _fetchEventSource(source, (events) => {
        if (fetchID === currentFetchID) {
          if (events) {
            if (options.eventDataTransform) {
              events = $.map(events, options.eventDataTransform)
            }
            if (source.eventDataTransform) {
              events = $.map(events, source.eventDataTransform)
            }
            // TODO: this technique is not ideal for static array event sources.
            //  For arrays, we'll want to process all events right in the beginning, then never again.

            for (let i = 0; i < events.length; i++) {
              events[i].source = source
              normalizeEvent(events[i])
            }
            cache = cache.concat(events)
          }
          pendingSourceCnt--
          if (!pendingSourceCnt) {
            reportEvents(cache)
          }
        }
      })
    }

    function _fetchEventSource(source, callback) {
      let i
      const fetchers = fc.sourceFetchers
      let res
      for (i = 0; i < fetchers.length; i++) {
        res = fetchers[i](source, rangeStart, rangeEnd, callback)
        if (res === true) {
          // the fetcher is in charge. made its own async request
          return
        }
        if (typeof res === "object") {
          // the fetcher returned a new source. process it
          _fetchEventSource(res, callback)
          return
        }
      }
      const events = source.events
      if (events) {
        if ($.isFunction(events)) {
          pushLoading()
          events(cloneDate(rangeStart), cloneDate(rangeEnd), (events) => {
            callback(events)
            popLoading()
          })
        } else if ($.isArray(events)) {
          callback(events)
        } else {
          callback()
        }
      } else {
        const url = source.url
        if (url) {
          const success = source.success
          const error = source.error
          const complete = source.complete

          // retrieve any outbound GET/POST $.ajax data from the options
          let customData
          if ($.isFunction(source.data)) {
            // supplied as a function that returns a key/value object
            customData = source.data()
          } else {
            // supplied as a straight key/value object
            customData = source.data
          }

          // use a copy of the custom data so we can modify the parameters
          // and not affect the passed-in object.
          const data = $.extend({}, customData || {})

          const startParam = firstDefined(source.startParam, options.startParam)
          const endParam = firstDefined(source.endParam, options.endParam)
          if (startParam) {
            data[startParam] = Math.round(+rangeStart / 1000)
          }
          if (endParam) {
            data[endParam] = Math.round(+rangeEnd / 1000)
          }

          pushLoading()
          $.ajax(
            $.extend({}, ajaxDefaults, source, {
              data: data,
              success: function (events) {
                events = events || []
                const res = applyAll(success, this, arguments)
                if ($.isArray(res)) {
                  events = res
                }
                callback(events)
              },
              error: function () {
                applyAll(error, this, arguments)
                callback()
              },
              complete: function () {
                applyAll(complete, this, arguments)
                popLoading()
              },
            }),
          )
        } else {
          callback()
        }
      }
    }

    /* Sources
	-----------------------------------------------------------------------------*/

    function addEventSource(source) {
      source = _addEventSource(source)
      if (source) {
        pendingSourceCnt++
        fetchEventSource(source, currentFetchID) // will eventually call reportEvents
      }
    }

    function _addEventSource(source) {
      if ($.isFunction(source) || $.isArray(source)) {
        source = { events: source }
      } else if (typeof source === "string") {
        source = { url: source }
      }
      if (typeof source === "object") {
        normalizeSource(source)
        sources.push(source)
        return source
      }
    }

    function removeEventSource(source) {
      sources = $.grep(sources, (src) => !isSourcesEqual(src, source))
      // remove all client events from that source
      cache = $.grep(cache, (e) => !isSourcesEqual(e.source, source))
      reportEvents(cache)
    }

    /* Manipulation
	-----------------------------------------------------------------------------*/

    function updateEvent(event) {
      // update an existing event
      let i
      const len = cache.length
      let e
      const defaultEventEnd = getView().defaultEventEnd // getView???
      const startDelta = event.start - event._start
      const endDelta = event.end
        ? event.end - (event._end || defaultEventEnd(event)) // event._end would be null if event.end
        : 0 // was null and event was just resized
      for (i = 0; i < len; i++) {
        e = cache[i]
        if (e._id === event._id && e !== event) {
          e.start = new Date(+e.start + startDelta)
          if (event.end) {
            if (e.end) {
              e.end = new Date(+e.end + endDelta)
            } else {
              e.end = new Date(+defaultEventEnd(e) + endDelta)
            }
          } else {
            e.end = null
          }
          e.title = event.title
          e.url = event.url
          e.allDay = event.allDay
          e.className = event.className
          e.editable = event.editable
          e.color = event.color
          e.backgroundColor = event.backgroundColor
          e.borderColor = event.borderColor
          e.textColor = event.textColor
          normalizeEvent(e)
        }
      }
      normalizeEvent(event)
      reportEvents(cache)
    }

    function renderEvent(event, stick) {
      normalizeEvent(event)
      if (!event.source) {
        if (stick) {
          stickySource.events.push(event)
          event.source = stickySource
        }
        cache.push(event)
      }
      reportEvents(cache)
    }

    function removeEvents(filter) {
      if (!filter) {
        // remove all
        cache = []
        // clear all array sources
        for (let i = 0; i < sources.length; i++) {
          if ($.isArray(sources[i].events)) {
            sources[i].events = []
          }
        }
      } else {
        if (!$.isFunction(filter)) {
          // an event ID
          const id = `${filter}`
          filter = (e) => e._id === id
        }
        cache = $.grep(cache, filter, true)
        // remove events from array sources
        for (let i = 0; i < sources.length; i++) {
          if ($.isArray(sources[i].events)) {
            sources[i].events = $.grep(sources[i].events, filter, true)
          }
        }
      }
      reportEvents(cache)
    }

    function clientEvents(filter) {
      if ($.isFunction(filter)) {
        return $.grep(cache, filter)
      }
      if (filter) {
        // an event ID
        filter += ""
        return $.grep(cache, (e) => e._id === filter)
      }
      return cache // else, return all
    }

    /* Loading State
	-----------------------------------------------------------------------------*/

    function pushLoading() {
      if (!loadingLevel++) {
        trigger("loading", null, true, getView())
      }
    }

    function popLoading() {
      if (!--loadingLevel) {
        trigger("loading", null, false, getView())
      }
    }

    /* Event Normalization
	-----------------------------------------------------------------------------*/

    function normalizeEvent(event) {
      const source = event.source || {}
      const ignoreTimezone = firstDefined(
        source.ignoreTimezone,
        options.ignoreTimezone,
      )
      event._id =
        event._id ||
        (event.id === undefined ? `_fc${eventGUID++}` : `${event.id}`)
      if (event.date) {
        if (!event.start) {
          event.start = event.date
        }
        event.date = undefined
      }
      event._start = cloneDate(
        (event.start = parseDate(event.start, ignoreTimezone)),
      )
      event.end = parseDate(event.end, ignoreTimezone)
      if (event.end && event.end <= event.start) {
        event.end = null
      }
      event._end = event.end ? cloneDate(event.end) : null
      if (event.allDay === undefined) {
        event.allDay = firstDefined(source.allDayDefault, options.allDayDefault)
      }
      if (event.className) {
        if (typeof event.className === "string") {
          event.className = event.className.split(/\s+/)
        }
      } else {
        event.className = []
      }
      // TODO: if there is no start date, return false to indicate an invalid event
    }

    /* Utils
	------------------------------------------------------------------------------*/

    function normalizeSource(source) {
      if (source.className) {
        // TODO: repeat code, same code for event classNames
        if (typeof source.className === "string") {
          source.className = source.className.split(/\s+/)
        }
      } else {
        source.className = []
      }
      const normalizers = fc.sourceNormalizers
      for (let i = 0; i < normalizers.length; i++) {
        normalizers[i](source)
      }
    }

    function isSourcesEqual(source1, source2) {
      return (
        source1 &&
        source2 &&
        getSourcePrimitive(source1) === getSourcePrimitive(source2)
      )
    }

    function getSourcePrimitive(source) {
      return (
        (typeof source === "object" ? source.events || source.url : "") ||
        source
      )
    }
  }

  fc.addDays = addDays
  fc.cloneDate = cloneDate
  fc.parseDate = parseDate
  fc.parseISO8601 = parseISO8601
  fc.parseTime = parseTime
  fc.formatDate = formatDate
  fc.formatDates = formatDates

  /* Date Math
-----------------------------------------------------------------------------*/

  const dayIDs = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
  const DAY_MS = 86400000
  const HOUR_MS = 3600000
  const MINUTE_MS = 60000

  function addYears(d, n, keepTime) {
    d.setFullYear(d.getFullYear() + n)
    if (!keepTime) {
      clearTime(d)
    }
    return d
  }

  function addMonths(d, n, keepTime) {
    // prevents day overflow/underflow
    if (+d) {
      // prevent infinite looping on invalid dates
      const m = d.getMonth() + n
      const check = cloneDate(d)
      check.setDate(1)
      check.setMonth(m)
      d.setMonth(m)
      if (!keepTime) {
        clearTime(d)
      }
      while (d.getMonth() !== check.getMonth()) {
        d.setDate(d.getDate() + (d < check ? 1 : -1))
      }
    }
    return d
  }

  function addDays(d, n, keepTime) {
    // deals with daylight savings
    if (+d) {
      const dd = d.getDate() + n
      const check = cloneDate(d)
      check.setHours(9) // set to middle of day
      check.setDate(dd)
      d.setDate(dd)
      if (!keepTime) {
        clearTime(d)
      }
      fixDate(d, check)
    }
    return d
  }

  function fixDate(d, check) {
    // force d to be on check's YMD, for daylight savings purposes
    if (+d) {
      // prevent infinite looping on invalid dates
      while (d.getDate() !== check.getDate()) {
        d.setTime(+d + (d < check ? 1 : -1) * HOUR_MS)
      }
    }
  }

  function addMinutes(d, n) {
    d.setMinutes(d.getMinutes() + n)
    return d
  }

  function clearTime(d) {
    d.setHours(0)
    d.setMinutes(0)
    d.setSeconds(0)
    d.setMilliseconds(0)
    return d
  }

  function cloneDate(d, dontKeepTime) {
    if (dontKeepTime) {
      return clearTime(new Date(+d))
    }
    return new Date(+d)
  }

  function zeroDate() {
    // returns a Date with time 00:00:00 and dateOfMonth=1
    let i = 0
    let d
    do {
      d = new Date(1970, i++, 1)
    } while (d.getHours()) // != 0
    return d
  }

  function dayDiff(d1, d2) {
    // d1 - d2
    return Math.round((cloneDate(d1, true) - cloneDate(d2, true)) / DAY_MS)
  }

  function setYMD(date, y, m, d) {
    if (y !== undefined && y !== date.getFullYear()) {
      date.setDate(1)
      date.setMonth(0)
      date.setFullYear(y)
    }
    if (m !== undefined && m !== date.getMonth()) {
      date.setDate(1)
      date.setMonth(m)
    }
    if (d !== undefined) {
      date.setDate(d)
    }
  }

  /* Date Parsing
-----------------------------------------------------------------------------*/

  function parseDate(s, ignoreTimezone) {
    // ignoreTimezone defaults to true
    if (typeof s === "object") {
      // already a Date object
      return s
    }
    if (typeof s === "number") {
      // a UNIX timestamp
      return new Date(s * 1000)
    }
    if (typeof s === "string") {
      if (s.match(/^\d+(\.\d+)?$/)) {
        // a UNIX timestamp
        return new Date(Number.parseFloat(s) * 1000)
      }
      if (ignoreTimezone === undefined) {
        ignoreTimezone = true
      }
      return parseISO8601(s, ignoreTimezone) || (s ? new Date(s) : null)
    }
    // TODO: never return invalid dates (like from new Date(<string>)), return null instead
    return null
  }

  function parseISO8601(s, ignoreTimezone) {
    // ignoreTimezone defaults to false
    // derived from http://delete.me.uk/2005/03/iso8601.html
    // TODO: for a know glitch/feature, read tests/issue_206_parseDate_dst.html
    const m = s.match(
      /^([0-9]{4})(-([0-9]{2})(-([0-9]{2})([T ]([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?(Z|(([-+])([0-9]{2})(:?([0-9]{2}))?))?)?)?)?$/,
    )
    if (!m) {
      return null
    }
    let date = new Date(m[1], 0, 1)
    if (ignoreTimezone || !m[13]) {
      const check = new Date(m[1], 0, 1, 9, 0)
      if (m[3]) {
        date.setMonth(m[3] - 1)
        check.setMonth(m[3] - 1)
      }
      if (m[5]) {
        date.setDate(m[5])
        check.setDate(m[5])
      }
      fixDate(date, check)
      if (m[7]) {
        date.setHours(m[7])
      }
      if (m[8]) {
        date.setMinutes(m[8])
      }
      if (m[10]) {
        date.setSeconds(m[10])
      }
      if (m[12]) {
        date.setMilliseconds(Number(`0.${m[12]}`) * 1000)
      }
      fixDate(date, check)
    } else {
      date.setUTCFullYear(m[1], m[3] ? m[3] - 1 : 0, m[5] || 1)
      date.setUTCHours(
        m[7] || 0,
        m[8] || 0,
        m[10] || 0,
        m[12] ? Number(`0.${m[12]}`) * 1000 : 0,
      )
      if (m[14]) {
        let offset = Number(m[16]) * 60 + (m[18] ? Number(m[18]) : 0)
        offset *= m[15] === "-" ? 1 : -1
        date = new Date(+date + offset * 60 * 1000)
      }
    }
    return date
  }

  function parseTime(s) {
    // returns minutes since start of day
    if (typeof s === "number") {
      // an hour
      return s * 60
    }
    if (typeof s === "object") {
      // a Date object
      return s.getHours() * 60 + s.getMinutes()
    }
    const m = s.match(/(\d+)(?::(\d+))?\s*(\w+)?/)
    if (m) {
      let h = Number.parseInt(m[1], 10)
      if (m[3]) {
        h %= 12
        if (m[3].toLowerCase().charAt(0) === "p") {
          h += 12
        }
      }
      return h * 60 + (m[2] ? Number.parseInt(m[2], 10) : 0)
    }
  }

  /* Date Formatting
-----------------------------------------------------------------------------*/
  // TODO: use same function formatDate(date, [date2], format, [options])

  function formatDate(date, format, options) {
    return formatDates(date, null, format, options)
  }

  function formatDates(date1, date2, format, options) {
    options = options || defaults
    let date = date1
    let otherDate = date2
    let i
    const len = format.length
    let c
    let i2
    let formatter
    let res = ""
    for (i = 0; i < len; i++) {
      c = format.charAt(i)
      if (c === "'") {
        for (i2 = i + 1; i2 < len; i2++) {
          if (format.charAt(i2) === "'") {
            if (date) {
              if (i2 === i + 1) {
                res += "'"
              } else {
                res += format.substring(i + 1, i2)
              }
              i = i2
            }
            break
          }
        }
      } else if (c === "(") {
        for (i2 = i + 1; i2 < len; i2++) {
          if (format.charAt(i2) === ")") {
            const subres = formatDate(
              date,
              format.substring(i + 1, i2),
              options,
            )
            if (Number.parseInt(subres.replace(/\D/, ""), 10)) {
              res += subres
            }
            i = i2
            break
          }
        }
      } else if (c === "[") {
        for (i2 = i + 1; i2 < len; i2++) {
          if (format.charAt(i2) === "]") {
            const subformat = format.substring(i + 1, i2)
            const subres = formatDate(date, subformat, options)
            if (subres !== formatDate(otherDate, subformat, options)) {
              res += subres
            }
            i = i2
            break
          }
        }
      } else if (c === "{") {
        date = date2
        otherDate = date1
      } else if (c === "}") {
        date = date1
        otherDate = date2
      } else {
        for (i2 = len; i2 > i; i2--) {
          if ((formatter = dateFormatters[format.substring(i, i2)])) {
            if (date) {
              res += formatter(date, options)
            }
            i = i2 - 1
            break
          }
        }
        if (i2 === i) {
          if (date) {
            res += c
          }
        }
      }
    }
    return res
  }

  const dateFormatters = {
    s: (d) => d.getSeconds(),
    ss: (d) => zeroPad(d.getSeconds()),
    m: (d) => d.getMinutes(),
    mm: (d) => zeroPad(d.getMinutes()),
    h: (d) => d.getHours() % 12 || 12,
    hh: (d) => zeroPad(d.getHours() % 12 || 12),
    H: (d) => d.getHours(),
    HH: (d) => zeroPad(d.getHours()),
    d: (d) => d.getDate(),
    dd: (d) => zeroPad(d.getDate()),
    ddd: (d, o) => o.dayNamesShort[d.getDay()],
    dddd: (d, o) => o.dayNames[d.getDay()],
    M: (d) => d.getMonth() + 1,
    MM: (d) => zeroPad(d.getMonth() + 1),
    MMM: (d, o) => o.monthNamesShort[d.getMonth()],
    MMMM: (d, o) => o.monthNames[d.getMonth()],
    yy: (d) => `${d.getFullYear()}`.substring(2),
    yyyy: (d) => d.getFullYear(),
    t: (d) => (d.getHours() < 12 ? "a" : "p"),
    tt: (d) => (d.getHours() < 12 ? "am" : "pm"),
    T: (d) => (d.getHours() < 12 ? "A" : "P"),
    TT: (d) => (d.getHours() < 12 ? "AM" : "PM"),
    u: (d) => formatDate(d, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    S: (d) => {
      const date = d.getDate()
      if (date > 10 && date < 20) {
        return "th"
      }
      return ["st", "nd", "rd"][(date % 10) - 1] || "th"
    },
    w: (d, o) => o.weekNumberCalculation(d),
    W: (d) => iso8601Week(d),
  }
  fc.dateFormatters = dateFormatters

  /* thanks jQuery UI (https://github.com/jquery/jquery-ui/blob/master/ui/jquery.ui.datepicker.js)
   *
   * Set as calculateWeek to determine the week of the year based on the ISO 8601 definition.
   * `date` - the date to get the week for
   * `number` - the number of the week within the year that contains this date
   */
  function iso8601Week(date) {
    let time
    const checkDate = new Date(date.getTime())

    // Find Thursday of this week starting on Monday
    checkDate.setDate(checkDate.getDate() + 4 - (checkDate.getDay() || 7))

    time = checkDate.getTime()
    checkDate.setMonth(0) // Compare with Jan 1
    checkDate.setDate(1)
    return Math.floor(Math.round((time - checkDate) / 86400000) / 7) + 1
  }

  fc.applyAll = applyAll

  /* Event Date Math
-----------------------------------------------------------------------------*/

  function exclEndDay(event) {
    if (event.end) {
      return _exclEndDay(event.end, event.allDay)
    }
    return addDays(cloneDate(event.start), 1)
  }

  function _exclEndDay(end, allDay) {
    end = cloneDate(end)
    return allDay || end.getHours() || end.getMinutes()
      ? addDays(end, 1)
      : clearTime(end)
    // why don't we check for seconds/ms too?
  }

  /* Event Element Binding
-----------------------------------------------------------------------------*/

  function lazySegBind(container, segs, bindHandlers) {
    container.unbind("mouseover").mouseover(function (ev) {
      let parent = ev.target
      let e
      let i
      let seg
      while (parent !== this) {
        e = parent
        parent = parent.parentNode
      }
      if ((i = e._fci) !== undefined) {
        e._fci = undefined
        seg = segs[i]
        bindHandlers(seg.event, seg.element, seg)
        $(ev.target).trigger(ev)
      }
      ev.stopPropagation()
    })
  }

  /* Element Dimensions
-----------------------------------------------------------------------------*/

  function setOuterWidth(element, width, includeMargins) {
    for (let i = 0, e; i < element.length; i++) {
      e = $(element[i])
      e.width(Math.max(0, width - hsides(e, includeMargins)))
    }
  }

  function setOuterHeight(element, height, includeMargins) {
    for (let i = 0, e; i < element.length; i++) {
      e = $(element[i])
      e.height(Math.max(0, height - vsides(e, includeMargins)))
    }
  }

  function hsides(element, includeMargins) {
    return (
      hpadding(element) +
      hborders(element) +
      (includeMargins ? hmargins(element) : 0)
    )
  }

  function hpadding(element) {
    return (
      (Number.parseFloat($.css(element[0], "paddingLeft", true)) || 0) +
      (Number.parseFloat($.css(element[0], "paddingRight", true)) || 0)
    )
  }

  function hmargins(element) {
    return (
      (Number.parseFloat($.css(element[0], "marginLeft", true)) || 0) +
      (Number.parseFloat($.css(element[0], "marginRight", true)) || 0)
    )
  }

  function hborders(element) {
    return (
      (Number.parseFloat($.css(element[0], "borderLeftWidth", true)) || 0) +
      (Number.parseFloat($.css(element[0], "borderRightWidth", true)) || 0)
    )
  }

  function vsides(element, includeMargins) {
    return (
      vpadding(element) +
      vborders(element) +
      (includeMargins ? vmargins(element) : 0)
    )
  }

  function vpadding(element) {
    return (
      (Number.parseFloat($.css(element[0], "paddingTop", true)) || 0) +
      (Number.parseFloat($.css(element[0], "paddingBottom", true)) || 0)
    )
  }

  function vmargins(element) {
    return (
      (Number.parseFloat($.css(element[0], "marginTop", true)) || 0) +
      (Number.parseFloat($.css(element[0], "marginBottom", true)) || 0)
    )
  }

  function vborders(element) {
    return (
      (Number.parseFloat($.css(element[0], "borderTopWidth", true)) || 0) +
      (Number.parseFloat($.css(element[0], "borderBottomWidth", true)) || 0)
    )
  }

  /* Misc Utils
-----------------------------------------------------------------------------*/

  //TODO: arraySlice
  //TODO: isFunction, grep ?

  function noop() {}

  function dateCompare(a, b) {
    return a - b
  }

  function arrayMax(a) {
    return Math.max.apply(Math, a)
  }

  function zeroPad(n) {
    return (n < 10 ? "0" : "") + n
  }

  function smartProperty(obj, name) {
    // get a camel-cased/namespaced property of an object
    if (obj[name] !== undefined) {
      return obj[name]
    }
    const parts = name.split(/(?=[A-Z])/)
    let i = parts.length - 1
    let res
    for (; i >= 0; i--) {
      res = obj[parts[i].toLowerCase()]
      if (res !== undefined) {
        return res
      }
    }
    return obj[""]
  }

  function htmlEscape(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/'/g, "&#039;")
      .replace(/"/g, "&quot;")
      .replace(/\n/g, "<br />")
  }

  function disableTextSelection(element) {
    element
      .attr("unselectable", "on")
      .css("MozUserSelect", "none")
      .bind("selectstart.ui", () => false)
  }

  /*
function enableTextSelection(element) {
	element
		.attr('unselectable', 'off')
		.css('MozUserSelect', '')
		.unbind('selectstart.ui');
}
*/

  function markFirstLast(e) {
    e.children()
      .removeClass("fc-first fc-last")
      .filter(":first-child")
      .addClass("fc-first")
      .end()
      .filter(":last-child")
      .addClass("fc-last")
  }

  function setDayID(cell, date) {
    cell.each((i, _cell) => {
      _cell.className = _cell.className.replace(
        /^fc-\w*/,
        `fc-${dayIDs[date.getDay()]}`,
      )
      // TODO: make a way that doesn't rely on order of classes
    })
  }

  function getSkinCss(event, opt) {
    const source = event.source || {}
    const eventColor = event.color
    const sourceColor = source.color
    const optionColor = opt("eventColor")
    const backgroundColor =
      event.backgroundColor ||
      eventColor ||
      source.backgroundColor ||
      sourceColor ||
      opt("eventBackgroundColor") ||
      optionColor
    const borderColor =
      event.borderColor ||
      eventColor ||
      source.borderColor ||
      sourceColor ||
      opt("eventBorderColor") ||
      optionColor
    const textColor =
      event.textColor || source.textColor || opt("eventTextColor")
    const statements = []
    if (backgroundColor) {
      statements.push(`background-color:${backgroundColor}`)
    }
    if (borderColor) {
      statements.push(`border-color:${borderColor}`)
    }
    if (textColor) {
      statements.push(`color:${textColor}`)
    }
    return statements.join(";")
  }

  function applyAll(functions, thisObj, args) {
    if ($.isFunction(functions)) {
      functions = [functions]
    }
    if (functions) {
      let i
      let ret
      for (i = 0; i < functions.length; i++) {
        ret = functions[i].apply(thisObj, args) || ret
      }
      return ret
    }
  }

  function firstDefined() {
    for (let i = 0; i < arguments.length; i++) {
      if (arguments[i] !== undefined) {
        return arguments[i]
      }
    }
  }

  fcViews.month = MonthView

  function MonthView(element, calendar) {
    const t = this

    // exports
    t.render = render

    // imports
    BasicView.call(t, element, calendar, "month")
    const opt = t.opt
    const renderBasic = t.renderBasic
    const skipHiddenDays = t.skipHiddenDays
    const getCellsPerWeek = t.getCellsPerWeek
    const formatDate = calendar.formatDate

    function render(date, delta) {
      if (delta) {
        addMonths(date, delta)
        date.setDate(1)
      }

      const firstDay = opt("firstDay")

      const start = cloneDate(date, true)
      start.setDate(1)

      const end = addMonths(cloneDate(start), 1)

      const visStart = cloneDate(start)
      addDays(visStart, -((visStart.getDay() - firstDay + 7) % 7))
      skipHiddenDays(visStart)

      const visEnd = cloneDate(end)
      addDays(visEnd, (7 - visEnd.getDay() + firstDay) % 7)
      skipHiddenDays(visEnd, -1, true)

      const colCnt = getCellsPerWeek()
      let rowCnt = Math.round(dayDiff(visEnd, visStart) / 7) // should be no need for Math.round

      if (opt("weekMode") === "fixed") {
        addDays(visEnd, (6 - rowCnt) * 7) // add weeks to make up for it
        rowCnt = 6
      }

      t.title = formatDate(start, opt("titleFormat"))

      t.start = start
      t.end = end
      t.visStart = visStart
      t.visEnd = visEnd

      renderBasic(rowCnt, colCnt, true)
    }
  }

  fcViews.basicWeek = BasicWeekView

  function BasicWeekView(element, calendar) {
    const t = this

    // exports
    t.render = render

    // imports
    BasicView.call(t, element, calendar, "basicWeek")
    const opt = t.opt
    const renderBasic = t.renderBasic
    const skipHiddenDays = t.skipHiddenDays
    const getCellsPerWeek = t.getCellsPerWeek
    const formatDates = calendar.formatDates

    function render(date, delta) {
      if (delta) {
        addDays(date, delta * 7)
      }

      const start = addDays(
        cloneDate(date),
        -((date.getDay() - opt("firstDay") + 7) % 7),
      )
      const end = addDays(cloneDate(start), 7)

      const visStart = cloneDate(start)
      skipHiddenDays(visStart)

      const visEnd = cloneDate(end)
      skipHiddenDays(visEnd, -1, true)

      const colCnt = getCellsPerWeek()

      t.start = start
      t.end = end
      t.visStart = visStart
      t.visEnd = visEnd

      t.title = formatDates(
        visStart,
        addDays(cloneDate(visEnd), -1),
        opt("titleFormat"),
      )

      renderBasic(1, colCnt, false)
    }
  }

  fcViews.basicDay = BasicDayView

  function BasicDayView(element, calendar) {
    const t = this

    // exports
    t.render = render

    // imports
    BasicView.call(t, element, calendar, "basicDay")
    const opt = t.opt
    const renderBasic = t.renderBasic
    const skipHiddenDays = t.skipHiddenDays
    const formatDate = calendar.formatDate

    function render(date, delta) {
      if (delta) {
        addDays(date, delta)
      }
      skipHiddenDays(date, delta < 0 ? -1 : 1)

      const start = cloneDate(date, true)
      const end = addDays(cloneDate(start), 1)

      t.title = formatDate(date, opt("titleFormat"))

      t.start = t.visStart = start
      t.end = t.visEnd = end

      renderBasic(1, 1, false)
    }
  }

  setDefaults({
    weekMode: "fixed",
  })

  function BasicView(element, calendar, viewName) {
    const t = this

    // exports
    t.renderBasic = renderBasic
    t.setHeight = setHeight
    t.setWidth = setWidth
    t.renderDayOverlay = renderDayOverlay
    t.defaultSelectionEnd = defaultSelectionEnd
    t.renderSelection = renderSelection
    t.clearSelection = clearSelection
    t.reportDayClick = reportDayClick // for selection (kinda hacky)
    t.dragStart = dragStart
    t.dragStop = dragStop
    t.defaultEventEnd = defaultEventEnd
    t.getHoverListener = () => hoverListener
    t.colLeft = colLeft
    t.colRight = colRight
    t.colContentLeft = colContentLeft
    t.colContentRight = colContentRight
    t.getIsCellAllDay = () => true
    t.allDayRow = allDayRow
    t.getRowCnt = () => rowCnt
    t.getColCnt = () => colCnt
    t.getColWidth = () => colWidth
    t.getDaySegmentContainer = () => daySegmentContainer

    // imports
    View.call(t, element, calendar, viewName)
    OverlayManager.call(t)
    SelectionManager.call(t)
    BasicEventRenderer.call(t)
    const opt = t.opt
    const trigger = t.trigger
    const renderOverlay = t.renderOverlay
    const clearOverlays = t.clearOverlays
    const daySelectionMousedown = t.daySelectionMousedown
    const cellToDate = t.cellToDate
    const dateToCell = t.dateToCell
    const rangeToSegments = t.rangeToSegments
    const formatDate = calendar.formatDate

    // locals

    let table
    let head
    let headCells
    let body
    let bodyRows
    let bodyCells
    let bodyFirstCells
    let firstRowCellInners
    let firstRowCellContentInners
    let daySegmentContainer

    let viewWidth
    let viewHeight
    let colWidth
    let weekNumberWidth

    let rowCnt
    let colCnt
    let showNumbers
    let coordinateGrid
    let hoverListener
    let colPositions
    let colContentPositions

    let tm
    let colFormat
    let showWeekNumbers
    let weekNumberTitle
    let weekNumberFormat

    /* Rendering
	------------------------------------------------------------*/

    disableTextSelection(element.addClass("fc-grid"))

    function renderBasic(_rowCnt, _colCnt, _showNumbers) {
      rowCnt = _rowCnt
      colCnt = _colCnt
      showNumbers = _showNumbers
      updateOptions()

      if (!body) {
        buildEventContainer()
      }

      buildTable()
    }

    function updateOptions() {
      tm = opt("theme") ? "ui" : "fc"
      colFormat = opt("columnFormat")

      // week # options. (TODO: bad, logic also in other views)
      showWeekNumbers = opt("weekNumbers")
      weekNumberTitle = opt("weekNumberTitle")
      if (opt("weekNumberCalculation") !== "iso") {
        weekNumberFormat = "w"
      } else {
        weekNumberFormat = "W"
      }
    }

    function buildEventContainer() {
      daySegmentContainer = $(
        "<div class='fc-event-container' style='position:absolute;z-index:8;top:0;left:0'/>",
      ).appendTo(element)
    }

    function buildTable() {
      const html = buildTableHTML()

      if (table) {
        table.remove()
      }
      table = $(html).appendTo(element)

      head = table.find("thead")
      headCells = head.find(".fc-day-header")
      body = table.find("tbody")
      bodyRows = body.find("tr")
      bodyCells = body.find(".fc-day")
      bodyFirstCells = bodyRows.find("td:first-child")

      firstRowCellInners = bodyRows.eq(0).find(".fc-day > div")
      firstRowCellContentInners = bodyRows.eq(0).find(".fc-day-content > div")

      markFirstLast(head.add(head.find("tr"))) // marks first+last tr/th's
      markFirstLast(bodyRows) // marks first+last td's
      bodyRows.eq(0).addClass("fc-first")
      bodyRows.filter(":last").addClass("fc-last")

      bodyCells.each((i, _cell) => {
        const date = cellToDate(Math.floor(i / colCnt), i % colCnt)
        trigger("dayRender", t, date, $(_cell))
      })

      dayBind(bodyCells)
    }

    /* HTML Building
	-----------------------------------------------------------*/

    function buildTableHTML() {
      const html = `<table class='fc-border-separate' style='width:100%' cellspacing='0'>${buildHeadHTML()}${buildBodyHTML()}</table>`

      return html
    }

    function buildHeadHTML() {
      const headerClass = `${tm}-widget-header`
      let html = ""
      let col
      let date

      html += "<thead><tr>"

      if (showWeekNumbers) {
        html += `<th class='fc-week-number ${headerClass}'>${htmlEscape(weekNumberTitle)}</th>`
      }

      for (col = 0; col < colCnt; col++) {
        date = cellToDate(0, col)
        html += `<th class='fc-day-header fc-${dayIDs[date.getDay()]} ${headerClass}'>${htmlEscape(formatDate(date, colFormat))}</th>`
      }

      html += "</tr></thead>"

      return html
    }

    function buildBodyHTML() {
      const contentClass = `${tm}-widget-content`
      let html = ""
      let row
      let col
      let date

      html += "<tbody>"

      for (row = 0; row < rowCnt; row++) {
        html += "<tr class='fc-week'>"

        if (showWeekNumbers) {
          date = cellToDate(row, 0)
          html += `<td class='fc-week-number ${contentClass}'><div>${htmlEscape(formatDate(date, weekNumberFormat))}</div></td>`
        }

        for (col = 0; col < colCnt; col++) {
          date = cellToDate(row, col)
          html += buildCellHTML(date)
        }

        html += "</tr>"
      }

      html += "</tbody>"

      return html
    }

    function buildCellHTML(date) {
      const contentClass = `${tm}-widget-content`
      const month = t.start.getMonth()
      const today = clearTime(new Date())
      let html = ""
      const classNames = ["fc-day", `fc-${dayIDs[date.getDay()]}`, contentClass]

      if (date.getMonth() !== month) {
        classNames.push("fc-other-month")
      }
      if (+date === +today) {
        classNames.push("fc-today", `${tm}-state-highlight`)
      } else if (date < today) {
        classNames.push("fc-past")
      } else {
        classNames.push("fc-future")
      }

      html += `<td class='${classNames.join(" ")}' data-date='${formatDate(date, "yyyy-MM-dd")}'><div>`

      if (showNumbers) {
        html += `<div class='fc-day-number'>${date.getDate()}</div>`
      }

      html +=
        "<div class='fc-day-content'>" +
        "<div style='position:relative'>&nbsp;</div>" +
        "</div>" +
        "</div>" +
        "</td>"

      return html
    }

    /* Dimensions
	-----------------------------------------------------------*/

    function setHeight(height) {
      viewHeight = height

      const bodyHeight = viewHeight - head.height()
      let rowHeight
      let rowHeightLast
      let cell

      if (opt("weekMode") === "variable") {
        rowHeight = rowHeightLast = Math.floor(
          bodyHeight / (rowCnt === 1 ? 2 : 6),
        )
      } else {
        rowHeight = Math.floor(bodyHeight / rowCnt)
        rowHeightLast = bodyHeight - rowHeight * (rowCnt - 1)
      }

      bodyFirstCells.each((i, _cell) => {
        if (i < rowCnt) {
          cell = $(_cell)
          cell
            .find("> div")
            .css(
              "min-height",
              (i === rowCnt - 1 ? rowHeightLast : rowHeight) - vsides(cell),
            )
        }
      })
    }

    function setWidth(width) {
      viewWidth = width
      colPositions.clear()
      colContentPositions.clear()

      weekNumberWidth = 0
      if (showWeekNumbers) {
        weekNumberWidth = head.find("th.fc-week-number").outerWidth()
      }

      colWidth = Math.floor((viewWidth - weekNumberWidth) / colCnt)
      setOuterWidth(headCells.slice(0, -1), colWidth)
    }

    /* Day clicking and binding
	-----------------------------------------------------------*/

    function dayBind(days) {
      days.click(dayClick).mousedown(daySelectionMousedown)
    }

    function dayClick(ev) {
      if (!opt("selectable")) {
        // if selectable, SelectionManager will worry about dayClick
        const date = parseISO8601($(this).data("date"))
        trigger("dayClick", this, date, true, ev)
      }
    }

    /* Semi-transparent Overlay Helpers
	------------------------------------------------------*/
    // TODO: should be consolidated with AgendaView's methods

    function renderDayOverlay(overlayStart, overlayEnd, refreshCoordinateGrid) {
      // overlayEnd is exclusive

      if (refreshCoordinateGrid) {
        coordinateGrid.build()
      }

      const segments = rangeToSegments(overlayStart, overlayEnd)

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        dayBind(
          renderCellOverlay(
            segment.row,
            segment.leftCol,
            segment.row,
            segment.rightCol,
          ),
        )
      }
    }

    function renderCellOverlay(row0, col0, row1, col1) {
      // row1,col1 is inclusive
      const rect = coordinateGrid.rect(row0, col0, row1, col1, element)
      return renderOverlay(rect, element)
    }

    /* Selection
	-----------------------------------------------------------------------*/

    function defaultSelectionEnd(startDate, allDay) {
      return cloneDate(startDate)
    }

    function renderSelection(startDate, endDate, allDay) {
      renderDayOverlay(startDate, addDays(cloneDate(endDate), 1), true) // rebuild every time???
    }

    function clearSelection() {
      clearOverlays()
    }

    function reportDayClick(date, allDay, ev) {
      const cell = dateToCell(date)
      const _element = bodyCells[cell.row * colCnt + cell.col]
      trigger("dayClick", _element, date, allDay, ev)
    }

    /* External Dragging
	-----------------------------------------------------------------------*/

    function dragStart(_dragElement, ev, ui) {
      hoverListener.start((cell) => {
        clearOverlays()
        if (cell) {
          renderCellOverlay(cell.row, cell.col, cell.row, cell.col)
        }
      }, ev)
    }

    function dragStop(_dragElement, ev, ui) {
      const cell = hoverListener.stop()
      clearOverlays()
      if (cell) {
        const d = cellToDate(cell)
        trigger("drop", _dragElement, d, true, ev, ui)
      }
    }

    /* Utilities
	--------------------------------------------------------*/

    function defaultEventEnd(event) {
      return cloneDate(event.start)
    }

    coordinateGrid = new CoordinateGrid((rows, cols) => {
      let e
      let n
      let p
      headCells.each((i, _e) => {
        e = $(_e)
        n = e.offset().left
        if (i) {
          p[1] = n
        }
        p = [n]
        cols[i] = p
      })
      p[1] = n + e.outerWidth()
      bodyRows.each((i, _e) => {
        if (i < rowCnt) {
          e = $(_e)
          n = e.offset().top
          if (i) {
            p[1] = n
          }
          p = [n]
          rows[i] = p
        }
      })
      p[1] = n + e.outerHeight()
    })

    hoverListener = new HoverListener(coordinateGrid)

    colPositions = new HorizontalPositionCache((col) =>
      firstRowCellInners.eq(col),
    )

    colContentPositions = new HorizontalPositionCache((col) =>
      firstRowCellContentInners.eq(col),
    )

    function colLeft(col) {
      return colPositions.left(col)
    }

    function colRight(col) {
      return colPositions.right(col)
    }

    function colContentLeft(col) {
      return colContentPositions.left(col)
    }

    function colContentRight(col) {
      return colContentPositions.right(col)
    }

    function allDayRow(i) {
      return bodyRows.eq(i)
    }
  }

  function BasicEventRenderer() {
    const t = this

    // exports
    t.renderEvents = renderEvents
    t.clearEvents = clearEvents

    // imports
    DayEventRenderer.call(t)

    function renderEvents(events, modifiedEventId) {
      t.renderDayEvents(events, modifiedEventId)
    }

    function clearEvents() {
      t.getDaySegmentContainer().empty()
    }

    // TODO: have this class (and AgendaEventRenderer) be responsible for creating the event container div
  }

  fcViews.agendaWeek = AgendaWeekView

  function AgendaWeekView(element, calendar) {
    const t = this

    // exports
    t.render = render

    // imports
    AgendaView.call(t, element, calendar, "agendaWeek")
    const opt = t.opt
    const renderAgenda = t.renderAgenda
    const skipHiddenDays = t.skipHiddenDays
    const getCellsPerWeek = t.getCellsPerWeek
    const formatDates = calendar.formatDates

    function render(date, delta) {
      if (delta) {
        addDays(date, delta * 7)
      }

      const start = addDays(
        cloneDate(date),
        -((date.getDay() - opt("firstDay") + 7) % 7),
      )
      const end = addDays(cloneDate(start), 7)

      const visStart = cloneDate(start)
      skipHiddenDays(visStart)

      const visEnd = cloneDate(end)
      skipHiddenDays(visEnd, -1, true)

      const colCnt = getCellsPerWeek()

      t.title = formatDates(
        visStart,
        addDays(cloneDate(visEnd), -1),
        opt("titleFormat"),
      )

      t.start = start
      t.end = end
      t.visStart = visStart
      t.visEnd = visEnd

      renderAgenda(colCnt)
    }
  }

  fcViews.agendaDay = AgendaDayView

  function AgendaDayView(element, calendar) {
    const t = this

    // exports
    t.render = render

    // imports
    AgendaView.call(t, element, calendar, "agendaDay")
    const opt = t.opt
    const renderAgenda = t.renderAgenda
    const skipHiddenDays = t.skipHiddenDays
    const formatDate = calendar.formatDate

    function render(date, delta) {
      if (delta) {
        addDays(date, delta)
      }
      skipHiddenDays(date, delta < 0 ? -1 : 1)

      const start = cloneDate(date, true)
      const end = addDays(cloneDate(start), 1)

      t.title = formatDate(date, opt("titleFormat"))

      t.start = t.visStart = start
      t.end = t.visEnd = end

      renderAgenda(1)
    }
  }

  setDefaults({
    allDaySlot: true,
    allDayText: "all-day",
    firstHour: 6,
    slotMinutes: 30,
    defaultEventMinutes: 120,
    axisFormat: "h(:mm)tt",
    timeFormat: {
      agenda: "h:mm{ - h:mm}",
    },
    dragOpacity: {
      agenda: 0.5,
    },
    minTime: 0,
    maxTime: 24,
    slotEventOverlap: true,
  })

  // TODO: make it work in quirks mode (event corners, all-day height)
  // TODO: test liquid width, especially in IE6

  function AgendaView(element, calendar, viewName) {
    // exports
    this.renderAgenda = renderAgenda
    this.setWidth = setWidth
    this.setHeight = setHeight
    this.afterRender = afterRender
    this.defaultEventEnd = defaultEventEnd
    this.timePosition = timePosition
    this.getIsCellAllDay = getIsCellAllDay
    this.allDayRow = getAllDayRow
    this.getCoordinateGrid = () => coordinateGrid // specifically for AgendaEventRenderer
    this.getHoverListener = () => hoverListener
    this.colLeft = colLeft
    this.colRight = colRight
    this.colContentLeft = colContentLeft
    this.colContentRight = colContentRight
    this.getDaySegmentContainer = () => daySegmentContainer
    this.getSlotSegmentContainer = () => slotSegmentContainer
    this.getMinMinute = () => minMinute
    this.getMaxMinute = () => maxMinute
    this.getSlotContainer = () => slotContainer
    this.getRowCnt = () => 1
    this.getColCnt = () => colCnt
    this.getColWidth = () => colWidth
    this.getSnapHeight = () => snapHeight
    this.getSnapMinutes = () => snapMinutes
    this.defaultSelectionEnd = defaultSelectionEnd
    this.renderDayOverlay = renderDayOverlay
    this.renderSelection = renderSelection
    this.clearSelection = clearSelection
    this.reportDayClick = reportDayClick // selection mousedown hack
    this.dragStart = dragStart
    this.dragStop = dragStop

    // imports
    View.call(this, element, calendar, viewName)
    OverlayManager.call(this)
    SelectionManager.call(this)
    AgendaEventRenderer.call(this)
    const opt = this.opt
    const trigger = this.trigger
    const renderOverlay = this.renderOverlay
    const clearOverlays = this.clearOverlays
    const reportSelection = this.reportSelection
    const unselect = this.unselect
    const daySelectionMousedown = this.daySelectionMousedown
    const slotSegHtml = this.slotSegHtml
    const cellToDate = this.cellToDate
    const dateToCell = this.dateToCell
    const rangeToSegments = this.rangeToSegments
    const formatDate = calendar.formatDate

    // locals

    let dayTable
    let dayHead
    let dayHeadCells
    let dayBody
    let dayBodyCells
    let dayBodyCellInners
    let dayBodyCellContentInners
    let dayBodyFirstCell
    let dayBodyFirstCellStretcher
    let slotLayer
    let daySegmentContainer
    let allDayTable
    let allDayRow
    let slotScroller
    let slotContainer
    let slotSegmentContainer
    let slotTable
    let selectionHelper

    let viewWidth
    let viewHeight
    let axisWidth
    let colWidth
    let gutterWidth
    let slotHeight // TODO: what if slotHeight changes? (see issue 650)

    let snapMinutes
    let snapRatio // ratio of number of "selection" slots to normal slots. (ex: 1, 2, 4)
    let snapHeight // holds the pixel hight of a "selection" slot

    let colCnt
    let slotCnt
    let coordinateGrid
    let hoverListener
    let colPositions
    let colContentPositions
    let slotTopCache = {}

    let tm
    let rtl
    let minMinute
    let maxMinute
    let colFormat
    let showWeekNumbers
    let weekNumberTitle
    let weekNumberFormat

    /* Rendering
	-----------------------------------------------------------------------------*/

    disableTextSelection(element.addClass("fc-agenda"))

    function renderAgenda(c) {
      colCnt = c
      updateOptions()

      if (!dayTable) {
        // first time rendering?
        buildSkeleton() // builds day table, slot area, events containers
      } else {
        buildDayTable() // rebuilds day table
      }
    }

    function updateOptions() {
      tm = opt("theme") ? "ui" : "fc"
      rtl = opt("isRTL")
      minMinute = parseTime(opt("minTime"))
      maxMinute = parseTime(opt("maxTime"))
      colFormat = opt("columnFormat")

      // week # options. (TODO: bad, logic also in other views)
      showWeekNumbers = opt("weekNumbers")
      weekNumberTitle = opt("weekNumberTitle")
      if (opt("weekNumberCalculation") !== "iso") {
        weekNumberFormat = "w"
      } else {
        weekNumberFormat = "W"
      }

      snapMinutes = opt("snapMinutes") || opt("slotMinutes")
    }

    /* Build DOM
	-----------------------------------------------------------------------*/

    function buildSkeleton() {
      const headerClass = `${tm}-widget-header`
      const contentClass = `${tm}-widget-content`
      let s
      let d
      let i
      let maxd
      let minutes
      const slotNormal = opt("slotMinutes") % 15 === 0

      buildDayTable()

      slotLayer = $(
        "<div style='position:absolute;z-index:2;left:0;width:100%'/>",
      ).appendTo(element)

      if (opt("allDaySlot")) {
        daySegmentContainer = $(
          "<div class='fc-event-container' style='position:absolute;z-index:8;top:0;left:0'/>",
        ).appendTo(slotLayer)

        s = `<table style='width:100%' class='fc-agenda-allday' cellspacing='0'><tr><th class='${headerClass} fc-agenda-axis'>${opt("allDayText")}</th><td><div class='fc-day-content'><div style='position:relative'/></div></td><th class='${headerClass} fc-agenda-gutter'>&nbsp;</th></tr></table>`
        allDayTable = $(s).appendTo(slotLayer)
        allDayRow = allDayTable.find("tr")

        dayBind(allDayRow.find("td"))

        slotLayer.append(
          `<div class='fc-agenda-divider ${headerClass}'><div class='fc-agenda-divider-inner'/></div>`,
        )
      } else {
        daySegmentContainer = $([]) // in jQuery 1.4, we can just do $()
      }

      slotScroller = $(
        "<div style='position:absolute;width:100%;overflow-x:hidden;overflow-y:auto'/>",
      ).appendTo(slotLayer)

      slotContainer = $(
        "<div style='position:relative;width:100%;overflow:hidden'/>",
      ).appendTo(slotScroller)

      slotSegmentContainer = $(
        "<div class='fc-event-container' style='position:absolute;z-index:8;top:0;left:0'/>",
      ).appendTo(slotContainer)

      s =
        "<table class='fc-agenda-slots' style='width:100%' cellspacing='0'>" +
        "<tbody>"
      d = zeroDate()
      maxd = addMinutes(cloneDate(d), maxMinute)
      addMinutes(d, minMinute)
      slotCnt = 0
      for (i = 0; d < maxd; i++) {
        minutes = d.getMinutes()
        s += `<tr class='fc-slot${i} ${!minutes ? "" : "fc-minor"}'><th class='fc-agenda-axis ${headerClass}'>${!slotNormal || !minutes ? formatDate(d, opt("axisFormat")) : "&nbsp;"}</th><td class='${contentClass}'><div style='position:relative'>&nbsp;</div></td></tr>`
        addMinutes(d, opt("slotMinutes"))
        slotCnt++
      }
      s += "</tbody>" + "</table>"
      slotTable = $(s).appendTo(slotContainer)

      slotBind(slotTable.find("td"))
    }

    /* Build Day Table
	-----------------------------------------------------------------------*/

    function buildDayTable() {
      const html = buildDayTableHTML()

      if (dayTable) {
        dayTable.remove()
      }
      dayTable = $(html).appendTo(element)

      dayHead = dayTable.find("thead")
      dayHeadCells = dayHead.find("th").slice(1, -1) // exclude gutter
      dayBody = dayTable.find("tbody")
      dayBodyCells = dayBody.find("td").slice(0, -1) // exclude gutter
      dayBodyCellInners = dayBodyCells.find("> div")
      dayBodyCellContentInners = dayBodyCells.find(".fc-day-content > div")

      dayBodyFirstCell = dayBodyCells.eq(0)
      dayBodyFirstCellStretcher = dayBodyCellInners.eq(0)

      markFirstLast(dayHead.add(dayHead.find("tr")))
      markFirstLast(dayBody.add(dayBody.find("tr")))

      // TODO: now that we rebuild the cells every time, we should call dayRender
    }

    function buildDayTableHTML() {
      const html = `<table style='width:100%' class='fc-agenda-days fc-border-separate' cellspacing='0'>${buildDayTableHeadHTML()}${buildDayTableBodyHTML()}</table>`

      return html
    }

    function buildDayTableHeadHTML() {
      const headerClass = `${tm}-widget-header`
      let date
      let html = ""
      let weekText
      let col

      html += "<thead>" + "<tr>"

      if (showWeekNumbers) {
        date = cellToDate(0, 0)
        weekText = formatDate(date, weekNumberFormat)
        if (rtl) {
          weekText += weekNumberTitle
        } else {
          weekText = weekNumberTitle + weekText
        }
        html += `<th class='fc-agenda-axis fc-week-number ${headerClass}'>${htmlEscape(weekText)}</th>`
      } else {
        html += `<th class='fc-agenda-axis ${headerClass}'>&nbsp;</th>`
      }

      for (col = 0; col < colCnt; col++) {
        date = cellToDate(0, col)
        html += `<th class='fc-${dayIDs[date.getDay()]} fc-col${col} ${headerClass}'>${htmlEscape(formatDate(date, colFormat))}</th>`
      }

      html += `<th class='fc-agenda-gutter ${headerClass}'>&nbsp;</th></tr></thead>`

      return html
    }

    function buildDayTableBodyHTML() {
      const headerClass = `${tm}-widget-header` // TODO: make these when updateOptions() called
      const contentClass = `${tm}-widget-content`
      let date
      const today = clearTime(new Date())
      let col
      let cellsHTML
      let cellHTML
      let classNames
      let html = ""

      html += `<tbody><tr><th class='fc-agenda-axis ${headerClass}'>&nbsp;</th>`

      cellsHTML = ""

      for (col = 0; col < colCnt; col++) {
        date = cellToDate(0, col)

        classNames = [
          `fc-col${col}`,
          `fc-${dayIDs[date.getDay()]}`,
          contentClass,
        ]
        if (+date === +today) {
          classNames.push(`${tm}-state-highlight`, "fc-today")
        } else if (date < today) {
          classNames.push("fc-past")
        } else {
          classNames.push("fc-future")
        }

        cellHTML = `<td class='${classNames.join(" ")}'><div><div class='fc-day-content'><div style='position:relative'>&nbsp;</div></div></div></td>`

        cellsHTML += cellHTML
      }

      html += cellsHTML
      html += `<td class='fc-agenda-gutter ${contentClass}'>&nbsp;</td></tr></tbody>`

      return html
    }

    // TODO: data-date on the cells

    /* Dimensions
	-----------------------------------------------------------------------*/

    function setHeight(height) {
      if (height === undefined) {
        height = viewHeight
      }
      viewHeight = height
      slotTopCache = {}

      const headHeight = dayBody.position().top
      const allDayHeight = slotScroller.position().top // including divider
      const bodyHeight = Math.min(
        // total body height, including borders
        height - headHeight, // when scrollbars
        slotTable.height() + allDayHeight + 1, // when no scrollbars. +1 for bottom border
      )

      dayBodyFirstCellStretcher.height(bodyHeight - vsides(dayBodyFirstCell))

      slotLayer.css("top", headHeight)

      slotScroller.height(bodyHeight - allDayHeight - 1)

      // the stylesheet guarantees that the first row has no border.
      // this allows .height() to work well cross-browser.
      slotHeight = slotTable.find("tr:first").height() + 1 // +1 for bottom border

      snapRatio = opt("slotMinutes") / snapMinutes
      snapHeight = slotHeight / snapRatio
    }

    function setWidth(width) {
      viewWidth = width
      colPositions.clear()
      colContentPositions.clear()

      let axisFirstCells = dayHead.find("th:first")
      if (allDayTable) {
        axisFirstCells = axisFirstCells.add(allDayTable.find("th:first"))
      }
      axisFirstCells = axisFirstCells.add(slotTable.find("th:first"))

      axisWidth = 0
      setOuterWidth(
        axisFirstCells.width("").each((i, _cell) => {
          axisWidth = Math.max(axisWidth, $(_cell).outerWidth())
        }),
        axisWidth,
      )

      let gutterCells = dayTable.find(".fc-agenda-gutter")
      if (allDayTable) {
        gutterCells = gutterCells.add(allDayTable.find("th.fc-agenda-gutter"))
      }

      const slotTableWidth = slotScroller[0].clientWidth // needs to be done after axisWidth (for IE7)

      gutterWidth = slotScroller.width() - slotTableWidth
      if (gutterWidth) {
        setOuterWidth(gutterCells, gutterWidth)
        gutterCells.show().prev().removeClass("fc-last")
      } else {
        gutterCells.hide().prev().addClass("fc-last")
      }

      colWidth = Math.floor((slotTableWidth - axisWidth) / colCnt)
      setOuterWidth(dayHeadCells.slice(0, -1), colWidth)
    }

    /* Scrolling
	-----------------------------------------------------------------------*/

    function resetScroll() {
      const d0 = zeroDate()
      const scrollDate = cloneDate(d0)
      scrollDate.setHours(opt("firstHour"))
      const top = timePosition(d0, scrollDate) + 1 // +1 for the border
      function scroll() {
        slotScroller.scrollTop(top)
      }
      scroll()
      setTimeout(scroll, 0) // overrides any previous scroll state made by the browser
    }

    function afterRender() {
      // after the view has been freshly rendered and sized
      resetScroll()
    }

    /* Slot/Day clicking and binding
	-----------------------------------------------------------------------*/

    function dayBind(cells) {
      cells.click(slotClick).mousedown(daySelectionMousedown)
    }

    function slotBind(cells) {
      cells.click(slotClick).mousedown(slotSelectionMousedown)
    }

    function slotClick(ev) {
      if (!opt("selectable")) {
        // if selectable, SelectionManager will worry about dayClick
        const col = Math.min(
          colCnt - 1,
          Math.floor(
            (ev.pageX - dayTable.offset().left - axisWidth) / colWidth,
          ),
        )
        const date = cellToDate(0, col)
        const rowMatch = this.parentNode.className.match(/fc-slot(\d+)/) // TODO: maybe use data
        if (rowMatch) {
          const mins = Number.parseInt(rowMatch[1]) * opt("slotMinutes")
          const hours = Math.floor(mins / 60)
          date.setHours(hours)
          date.setMinutes((mins % 60) + minMinute)
          trigger("dayClick", dayBodyCells[col], date, false, ev)
        } else {
          trigger("dayClick", dayBodyCells[col], date, true, ev)
        }
      }
    }

    /* Semi-transparent Overlay Helpers
	-----------------------------------------------------*/
    // TODO: should be consolidated with BasicView's methods

    function renderDayOverlay(overlayStart, overlayEnd, refreshCoordinateGrid) {
      // overlayEnd is exclusive

      if (refreshCoordinateGrid) {
        coordinateGrid.build()
      }

      const segments = rangeToSegments(overlayStart, overlayEnd)

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        dayBind(
          renderCellOverlay(
            segment.row,
            segment.leftCol,
            segment.row,
            segment.rightCol,
          ),
        )
      }
    }

    function renderCellOverlay(row0, col0, row1, col1) {
      // only for all-day?
      const rect = coordinateGrid.rect(row0, col0, row1, col1, slotLayer)
      return renderOverlay(rect, slotLayer)
    }

    function renderSlotOverlay(overlayStart, overlayEnd) {
      for (let i = 0; i < colCnt; i++) {
        const dayStart = cellToDate(0, i)
        const dayEnd = addDays(cloneDate(dayStart), 1)
        const stretchStart = new Date(Math.max(dayStart, overlayStart))
        const stretchEnd = new Date(Math.min(dayEnd, overlayEnd))
        if (stretchStart < stretchEnd) {
          const rect = coordinateGrid.rect(0, i, 0, i, slotContainer) // only use it for horizontal coords
          const top = timePosition(dayStart, stretchStart)
          const bottom = timePosition(dayStart, stretchEnd)
          rect.top = top
          rect.height = bottom - top
          slotBind(renderOverlay(rect, slotContainer))
        }
      }
    }

    /* Coordinate Utilities
	-----------------------------------------------------------------------------*/

    coordinateGrid = new CoordinateGrid((rows, cols) => {
      let e
      let n
      let p
      dayHeadCells.each((i, _e) => {
        e = $(_e)
        n = e.offset().left
        if (i) {
          p[1] = n
        }
        p = [n]
        cols[i] = p
      })
      p[1] = n + e.outerWidth()
      if (opt("allDaySlot")) {
        e = allDayRow
        n = e.offset().top
        rows[0] = [n, n + e.outerHeight()]
      }
      const slotTableTop = slotContainer.offset().top
      const slotScrollerTop = slotScroller.offset().top
      const slotScrollerBottom = slotScrollerTop + slotScroller.outerHeight()
      function constrain(n) {
        return Math.max(slotScrollerTop, Math.min(slotScrollerBottom, n))
      }
      for (let i = 0; i < slotCnt * snapRatio; i++) {
        // adapt slot count to increased/decreased selection slot count
        rows.push([
          constrain(slotTableTop + snapHeight * i),
          constrain(slotTableTop + snapHeight * (i + 1)),
        ])
      }
    })

    hoverListener = new HoverListener(coordinateGrid)

    colPositions = new HorizontalPositionCache((col) =>
      dayBodyCellInners.eq(col),
    )

    colContentPositions = new HorizontalPositionCache((col) =>
      dayBodyCellContentInners.eq(col),
    )

    function colLeft(col) {
      return colPositions.left(col)
    }

    function colContentLeft(col) {
      return colContentPositions.left(col)
    }

    function colRight(col) {
      return colPositions.right(col)
    }

    function colContentRight(col) {
      return colContentPositions.right(col)
    }

    function getIsCellAllDay(cell) {
      return opt("allDaySlot") && !cell.row
    }

    function realCellToDate(cell) {
      // ugh "real" ... but blame it on our abuse of the "cell" system
      const d = cellToDate(0, cell.col)
      let slotIndex = cell.row
      if (opt("allDaySlot")) {
        slotIndex--
      }
      if (slotIndex >= 0) {
        addMinutes(d, minMinute + slotIndex * snapMinutes)
      }
      return d
    }

    // get the Y coordinate of the given time on the given day (both Date objects)
    function timePosition(day, time) {
      // both date objects. day holds 00:00 of current day
      day = cloneDate(day, true)
      if (time < addMinutes(cloneDate(day), minMinute)) {
        return 0
      }
      if (time >= addMinutes(cloneDate(day), maxMinute)) {
        return slotTable.height()
      }
      const slotMinutes = opt("slotMinutes")
      const minutes = time.getHours() * 60 + time.getMinutes() - minMinute
      const slotI = Math.floor(minutes / slotMinutes)
      let slotTop = slotTopCache[slotI]
      if (slotTop === undefined) {
        slotTop = slotTopCache[slotI] = slotTable
          .find("tr")
          .eq(slotI)
          .find("td div")[0].offsetTop
        // .eq() is faster than ":eq()" selector
        // [0].offsetTop is faster than .position().top (do we really need this optimization?)
        // a better optimization would be to cache all these divs
      }
      return Math.max(
        0,
        Math.round(
          slotTop - 1 + slotHeight * ((minutes % slotMinutes) / slotMinutes),
        ),
      )
    }

    function getAllDayRow(index) {
      return allDayRow
    }

    function defaultEventEnd(event) {
      const start = cloneDate(event.start)
      if (event.allDay) {
        return start
      }
      return addMinutes(start, opt("defaultEventMinutes"))
    }

    /* Selection
	---------------------------------------------------------------------------------*/

    function defaultSelectionEnd(startDate, allDay) {
      if (allDay) {
        return cloneDate(startDate)
      }
      return addMinutes(cloneDate(startDate), opt("slotMinutes"))
    }

    function renderSelection(startDate, endDate, allDay) {
      // only for all-day
      if (allDay) {
        if (opt("allDaySlot")) {
          renderDayOverlay(startDate, addDays(cloneDate(endDate), 1), true)
        }
      } else {
        renderSlotSelection(startDate, endDate)
      }
    }

    function renderSlotSelection(startDate, endDate) {
      const helperOption = opt("selectHelper")
      coordinateGrid.build()
      if (helperOption) {
        const col = dateToCell(startDate).col
        if (col >= 0 && col < colCnt) {
          // only works when times are on same day
          const rect = coordinateGrid.rect(0, col, 0, col, slotContainer) // only for horizontal coords
          const top = timePosition(startDate, startDate)
          const bottom = timePosition(startDate, endDate)
          if (bottom > top) {
            // protect against selections that are entirely before or after visible range
            rect.top = top
            rect.height = bottom - top
            rect.left += 2
            rect.width -= 5
            if ($.isFunction(helperOption)) {
              const helperRes = helperOption(startDate, endDate)
              if (helperRes) {
                rect.position = "absolute"
                selectionHelper = $(helperRes).css(rect).appendTo(slotContainer)
              }
            } else {
              rect.isStart = true // conside rect a "seg" now
              rect.isEnd = true //
              selectionHelper = $(
                slotSegHtml(
                  {
                    title: "",
                    start: startDate,
                    end: endDate,
                    className: ["fc-select-helper"],
                    editable: false,
                  },
                  rect,
                ),
              )
              selectionHelper.css("opacity", opt("dragOpacity"))
            }
            if (selectionHelper) {
              slotBind(selectionHelper)
              slotContainer.append(selectionHelper)
              setOuterWidth(selectionHelper, rect.width, true) // needs to be after appended
              setOuterHeight(selectionHelper, rect.height, true)
            }
          }
        }
      } else {
        renderSlotOverlay(startDate, endDate)
      }
    }

    function clearSelection() {
      clearOverlays()
      if (selectionHelper) {
        selectionHelper.remove()
        selectionHelper = null
      }
    }

    function slotSelectionMousedown(ev) {
      if (ev.which === 1 && opt("selectable")) {
        // ev.which==1 means left mouse button
        unselect(ev)
        let dates
        hoverListener.start((cell, origCell) => {
          clearSelection()
          if (cell && cell.col === origCell.col && !getIsCellAllDay(cell)) {
            const d1 = realCellToDate(origCell)
            const d2 = realCellToDate(cell)
            dates = [
              d1,
              addMinutes(cloneDate(d1), snapMinutes), // calculate minutes depending on selection slot minutes
              d2,
              addMinutes(cloneDate(d2), snapMinutes),
            ].sort(dateCompare)
            renderSlotSelection(dates[0], dates[3])
          } else {
            dates = null
          }
        }, ev)
        $(document).one("mouseup", (ev) => {
          hoverListener.stop()
          if (dates) {
            if (+dates[0] === +dates[1]) {
              reportDayClick(dates[0], false, ev)
            }
            reportSelection(dates[0], dates[3], false, ev)
          }
        })
      }
    }

    function reportDayClick(date, allDay, ev) {
      trigger("dayClick", dayBodyCells[dateToCell(date).col], date, allDay, ev)
    }

    /* External Dragging
	--------------------------------------------------------------------------------*/

    function dragStart(_dragElement, ev, ui) {
      hoverListener.start((cell) => {
        clearOverlays()
        if (cell) {
          if (getIsCellAllDay(cell)) {
            renderCellOverlay(cell.row, cell.col, cell.row, cell.col)
          } else {
            const d1 = realCellToDate(cell)
            const d2 = addMinutes(cloneDate(d1), opt("defaultEventMinutes"))
            renderSlotOverlay(d1, d2)
          }
        }
      }, ev)
    }

    function dragStop(_dragElement, ev, ui) {
      const cell = hoverListener.stop()
      clearOverlays()
      if (cell) {
        trigger(
          "drop",
          _dragElement,
          realCellToDate(cell),
          getIsCellAllDay(cell),
          ev,
          ui,
        )
      }
    }
  }

  function AgendaEventRenderer() {
    const t = this

    // exports
    t.renderEvents = renderEvents
    t.clearEvents = clearEvents
    t.slotSegHtml = slotSegHtml

    // imports
    DayEventRenderer.call(t)
    const opt = t.opt
    const trigger = t.trigger
    const isEventDraggable = t.isEventDraggable
    const isEventResizable = t.isEventResizable
    const eventEnd = t.eventEnd
    const eventElementHandlers = t.eventElementHandlers
    const setHeight = t.setHeight
    const getDaySegmentContainer = t.getDaySegmentContainer
    const getSlotSegmentContainer = t.getSlotSegmentContainer
    const getHoverListener = t.getHoverListener
    const getMaxMinute = t.getMaxMinute
    const getMinMinute = t.getMinMinute
    const timePosition = t.timePosition
    const getIsCellAllDay = t.getIsCellAllDay
    const colContentLeft = t.colContentLeft
    const colContentRight = t.colContentRight
    const cellToDate = t.cellToDate
    const getColCnt = t.getColCnt
    const getColWidth = t.getColWidth
    const getSnapHeight = t.getSnapHeight
    const getSnapMinutes = t.getSnapMinutes
    const getSlotContainer = t.getSlotContainer
    const reportEventElement = t.reportEventElement
    const showEvents = t.showEvents
    const hideEvents = t.hideEvents
    const eventDrop = t.eventDrop
    const eventResize = t.eventResize
    const renderDayOverlay = t.renderDayOverlay
    const clearOverlays = t.clearOverlays
    const renderDayEvents = t.renderDayEvents
    const calendar = t.calendar
    const formatDate = calendar.formatDate
    const formatDates = calendar.formatDates

    // overrides
    t.draggableDayEvent = draggableDayEvent

    /* Rendering
	----------------------------------------------------------------------------*/

    function renderEvents(events, modifiedEventId) {
      let i
      const len = events.length
      const dayEvents = []
      const slotEvents = []
      for (i = 0; i < len; i++) {
        if (events[i].allDay) {
          dayEvents.push(events[i])
        } else {
          slotEvents.push(events[i])
        }
      }

      if (opt("allDaySlot")) {
        renderDayEvents(dayEvents, modifiedEventId)
        setHeight() // no params means set to viewHeight
      }

      renderSlotSegs(compileSlotSegs(slotEvents), modifiedEventId)
    }

    function clearEvents() {
      getDaySegmentContainer().empty()
      getSlotSegmentContainer().empty()
    }

    function compileSlotSegs(events) {
      const colCnt = getColCnt()
      const minMinute = getMinMinute()
      const maxMinute = getMaxMinute()
      let d
      const visEventEnds = $.map(events, slotEventEnd)
      let i
      let j
      let seg
      let colSegs
      const segs = []

      for (i = 0; i < colCnt; i++) {
        d = cellToDate(0, i)
        addMinutes(d, minMinute)

        colSegs = sliceSegs(
          events,
          visEventEnds,
          d,
          addMinutes(cloneDate(d), maxMinute - minMinute),
        )

        colSegs = placeSlotSegs(colSegs) // returns a new order

        for (j = 0; j < colSegs.length; j++) {
          seg = colSegs[j]
          seg.col = i
          segs.push(seg)
        }
      }

      return segs
    }

    function sliceSegs(events, visEventEnds, start, end) {
      const segs = []
      let i
      const len = events.length
      let event
      let eventStart
      let eventEnd
      let segStart
      let segEnd
      let isStart
      let isEnd
      for (i = 0; i < len; i++) {
        event = events[i]
        eventStart = event.start
        eventEnd = visEventEnds[i]
        if (eventEnd > start && eventStart < end) {
          if (eventStart < start) {
            segStart = cloneDate(start)
            isStart = false
          } else {
            segStart = eventStart
            isStart = true
          }
          if (eventEnd > end) {
            segEnd = cloneDate(end)
            isEnd = false
          } else {
            segEnd = eventEnd
            isEnd = true
          }
          segs.push({
            event: event,
            start: segStart,
            end: segEnd,
            isStart: isStart,
            isEnd: isEnd,
          })
        }
      }
      return segs.sort(compareSlotSegs)
    }

    function slotEventEnd(event) {
      if (event.end) {
        return cloneDate(event.end)
      }
      return addMinutes(cloneDate(event.start), opt("defaultEventMinutes"))
    }

    // renders events in the 'time slots' at the bottom
    // TODO: when we refactor this, when user returns `false` eventRender, don't have empty space
    // TODO: refactor will include using pixels to detect collisions instead of dates (handy for seg cmp)

    function renderSlotSegs(segs, modifiedEventId) {
      let i
      const segCnt = segs.length
      let seg
      let event
      let top
      let bottom
      let columnLeft
      let columnRight
      let columnWidth
      let width
      let left
      let right
      let html = ""
      let eventElements
      let eventElement
      let triggerRes
      let titleElement
      let height
      const slotSegmentContainer = getSlotSegmentContainer()
      const isRTL = opt("isRTL")

      // calculate position/dimensions, create html
      for (i = 0; i < segCnt; i++) {
        seg = segs[i]
        event = seg.event
        top = timePosition(seg.start, seg.start)
        bottom = timePosition(seg.start, seg.end)
        columnLeft = colContentLeft(seg.col)
        columnRight = colContentRight(seg.col)
        columnWidth = columnRight - columnLeft

        // shave off space on right near scrollbars (2.5%)
        // TODO: move this to CSS somehow
        columnRight -= columnWidth * 0.025
        columnWidth = columnRight - columnLeft

        width = columnWidth * (seg.forwardCoord - seg.backwardCoord)

        if (opt("slotEventOverlap")) {
          // double the width while making sure resize handle is visible
          // (assumed to be 20px wide)
          width = Math.max(
            (width - 20 / 2) * 2,
            width, // narrow columns will want to make the segment smaller than
            // the natural width. don't allow it
          )
        }

        if (isRTL) {
          right = columnRight - seg.backwardCoord * columnWidth
          left = right - width
        } else {
          left = columnLeft + seg.backwardCoord * columnWidth
          right = left + width
        }

        // make sure horizontal coordinates are in bounds
        left = Math.max(left, columnLeft)
        right = Math.min(right, columnRight)
        width = right - left

        seg.top = top
        seg.left = left
        seg.outerWidth = width
        seg.outerHeight = bottom - top
        html += slotSegHtml(event, seg)
      }

      slotSegmentContainer[0].innerHTML = html // faster than html()
      eventElements = slotSegmentContainer.children()

      // retrieve elements, run through eventRender callback, bind event handlers
      for (i = 0; i < segCnt; i++) {
        seg = segs[i]
        event = seg.event
        eventElement = $(eventElements[i]) // faster than eq()
        triggerRes = trigger("eventRender", event, event, eventElement)
        if (triggerRes === false) {
          eventElement.remove()
        } else {
          if (triggerRes && triggerRes !== true) {
            eventElement.remove()
            eventElement = $(triggerRes)
              .css({
                position: "absolute",
                top: seg.top,
                left: seg.left,
              })
              .appendTo(slotSegmentContainer)
          }
          seg.element = eventElement
          if (event._id === modifiedEventId) {
            bindSlotSeg(event, eventElement, seg)
          } else {
            eventElement[0]._fci = i // for lazySegBind
          }
          reportEventElement(event, eventElement)
        }
      }

      lazySegBind(slotSegmentContainer, segs, bindSlotSeg)

      // record event sides and title positions
      for (i = 0; i < segCnt; i++) {
        seg = segs[i]
        if ((eventElement = seg.element)) {
          seg.vsides = vsides(eventElement, true)
          seg.hsides = hsides(eventElement, true)
          titleElement = eventElement.find(".fc-event-title")
          if (titleElement.length) {
            seg.contentTop = titleElement[0].offsetTop
          }
        }
      }

      // set all positions/dimensions at once
      for (i = 0; i < segCnt; i++) {
        seg = segs[i]
        if ((eventElement = seg.element)) {
          eventElement[0].style.width = `${Math.max(0, seg.outerWidth - seg.hsides)}px`
          height = Math.max(0, seg.outerHeight - seg.vsides)
          eventElement[0].style.height = `${height}px`
          event = seg.event
          if (seg.contentTop !== undefined && height - seg.contentTop < 10) {
            // not enough room for title, put it in the time (TODO: maybe make both display:inline instead)
            eventElement
              .find("div.fc-event-time")
              .text(
                `${formatDate(event.start, opt("timeFormat"))} - ${event.title}`,
              )
            eventElement.find("div.fc-event-title").remove()
          }
          trigger("eventAfterRender", event, event, eventElement)
        }
      }
    }

    function slotSegHtml(event, seg) {
      let html = "<"
      const url = event.url
      const skinCss = getSkinCss(event, opt)
      let classes = ["fc-event", "fc-event-vert"]
      if (isEventDraggable(event)) {
        classes.push("fc-event-draggable")
      }
      if (seg.isStart) {
        classes.push("fc-event-start")
      }
      if (seg.isEnd) {
        classes.push("fc-event-end")
      }
      classes = classes.concat(event.className)
      if (event.source) {
        classes = classes.concat(event.source.className || [])
      }
      if (url) {
        html += `a href='${htmlEscape(event.url)}'`
      } else {
        html += "div"
      }
      html += ` class='${classes.join(" ")}' style='position:absolute;top:${seg.top}px;left:${seg.left}px;${skinCss}'><div class='fc-event-inner'><div class='fc-event-time'>${htmlEscape(formatDates(event.start, event.end, opt("timeFormat")))}</div><div class='fc-event-title'>${htmlEscape(event.title || "")}</div></div><div class='fc-event-bg'></div>`
      if (seg.isEnd && isEventResizable(event)) {
        html += "<div class='ui-resizable-handle ui-resizable-s'>=</div>"
      }
      html += `</${url ? "a" : "div"}>`
      return html
    }

    function bindSlotSeg(event, eventElement, seg) {
      const timeElement = eventElement.find("div.fc-event-time")
      if (isEventDraggable(event)) {
        draggableSlotEvent(event, eventElement, timeElement)
      }
      if (seg.isEnd && isEventResizable(event)) {
        resizableSlotEvent(event, eventElement, timeElement)
      }
      eventElementHandlers(event, eventElement)
    }

    /* Dragging
	-----------------------------------------------------------------------------------*/

    // when event starts out FULL-DAY
    // overrides DayEventRenderer's version because it needs to account for dragging elements
    // to and from the slot area.

    function draggableDayEvent(event, eventElement, seg) {
      const isStart = seg.isStart
      let origWidth
      let revert
      let allDay = true
      let dayDelta
      const hoverListener = getHoverListener()
      const colWidth = getColWidth()
      const snapHeight = getSnapHeight()
      const snapMinutes = getSnapMinutes()
      const minMinute = getMinMinute()
      eventElement.draggable({
        opacity: opt("dragOpacity", "month"), // use whatever the month view was using
        revertDuration: opt("dragRevertDuration"),
        start: (ev, ui) => {
          trigger("eventDragStart", eventElement, event, ev, ui)
          hideEvents(event, eventElement)
          origWidth = eventElement.width()
          hoverListener.start(
            (cell, origCell) => {
              clearOverlays()
              if (cell) {
                revert = false
                const origDate = cellToDate(0, origCell.col)
                const date = cellToDate(0, cell.col)
                dayDelta = dayDiff(date, origDate)
                if (!cell.row) {
                  // on full-days
                  renderDayOverlay(
                    addDays(cloneDate(event.start), dayDelta),
                    addDays(exclEndDay(event), dayDelta),
                  )
                  resetElement()
                } else {
                  // mouse is over bottom slots
                  if (isStart) {
                    if (allDay) {
                      // convert event to temporary slot-event
                      eventElement.width(colWidth - 10) // don't use entire width
                      setOuterHeight(
                        eventElement,
                        snapHeight *
                          Math.round(
                            (event.end
                              ? (event.end - event.start) / MINUTE_MS
                              : opt("defaultEventMinutes")) / snapMinutes,
                          ),
                      )
                      eventElement.draggable("option", "grid", [colWidth, 1])
                      allDay = false
                    }
                  } else {
                    revert = true
                  }
                }
                revert = revert || (allDay && !dayDelta)
              } else {
                resetElement()
                revert = true
              }
              eventElement.draggable("option", "revert", revert)
            },
            ev,
            "drag",
          )
        },
        stop: function (ev, ui) {
          hoverListener.stop()
          clearOverlays()
          trigger("eventDragStop", eventElement, event, ev, ui)
          if (revert) {
            // hasn't moved or is out of bounds (draggable has already reverted)
            resetElement()
            eventElement.css("filter", "") // clear IE opacity side-effects
            showEvents(event, eventElement)
          } else {
            // changed!
            let minuteDelta = 0
            if (!allDay) {
              minuteDelta =
                Math.round(
                  (eventElement.offset().top -
                    getSlotContainer().offset().top) /
                    snapHeight,
                ) *
                  snapMinutes +
                minMinute -
                (event.start.getHours() * 60 + event.start.getMinutes())
            }
            eventDrop(this, event, dayDelta, minuteDelta, allDay, ev, ui)
          }
        },
      })
      function resetElement() {
        if (!allDay) {
          eventElement
            .width(origWidth)
            .height("")
            .draggable("option", "grid", null)
          allDay = true
        }
      }
    }

    // when event starts out IN TIMESLOTS

    function draggableSlotEvent(event, eventElement, timeElement) {
      const coordinateGrid = t.getCoordinateGrid()
      const colCnt = getColCnt()
      const colWidth = getColWidth()
      const snapHeight = getSnapHeight()
      const snapMinutes = getSnapMinutes()

      // states
      let origPosition // original position of the element, not the mouse
      let origCell
      let isInBounds
      let prevIsInBounds
      let isAllDay
      let prevIsAllDay
      let colDelta
      let prevColDelta
      let dayDelta // derived from colDelta
      let minuteDelta
      let prevMinuteDelta

      eventElement.draggable({
        scroll: false,
        grid: [colWidth, snapHeight],
        axis: colCnt === 1 ? "y" : false,
        opacity: opt("dragOpacity"),
        revertDuration: opt("dragRevertDuration"),
        start: (ev, ui) => {
          trigger("eventDragStart", eventElement, event, ev, ui)
          hideEvents(event, eventElement)

          coordinateGrid.build()

          // initialize states
          origPosition = eventElement.position()
          origCell = coordinateGrid.cell(ev.pageX, ev.pageY)
          isInBounds = prevIsInBounds = true
          isAllDay = prevIsAllDay = getIsCellAllDay(origCell)
          colDelta = prevColDelta = 0
          dayDelta = 0
          minuteDelta = prevMinuteDelta = 0
        },
        drag: (ev, ui) => {
          // NOTE: this `cell` value is only useful for determining in-bounds and all-day.
          // Bad for anything else due to the discrepancy between the mouse position and the
          // element position while snapping. (problem revealed in PR #55)
          //
          // PS- the problem exists for draggableDayEvent() when dragging an all-day event to a slot event.
          // We should overhaul the dragging system and stop relying on jQuery UI.
          const cell = coordinateGrid.cell(ev.pageX, ev.pageY)

          // update states
          isInBounds = !!cell
          if (isInBounds) {
            isAllDay = getIsCellAllDay(cell)

            // calculate column delta
            colDelta = Math.round(
              (ui.position.left - origPosition.left) / colWidth,
            )
            if (colDelta !== prevColDelta) {
              // calculate the day delta based off of the original clicked column and the column delta
              const origDate = cellToDate(0, origCell.col)
              let col = origCell.col + colDelta
              col = Math.max(0, col)
              col = Math.min(colCnt - 1, col)
              const date = cellToDate(0, col)
              dayDelta = dayDiff(date, origDate)
            }

            // calculate minute delta (only if over slots)
            if (!isAllDay) {
              minuteDelta =
                Math.round((ui.position.top - origPosition.top) / snapHeight) *
                snapMinutes
            }
          }

          // any state changes?
          if (
            isInBounds !== prevIsInBounds ||
            isAllDay !== prevIsAllDay ||
            colDelta !== prevColDelta ||
            minuteDelta !== prevMinuteDelta
          ) {
            updateUI()

            // update previous states for next time
            prevIsInBounds = isInBounds
            prevIsAllDay = isAllDay
            prevColDelta = colDelta
            prevMinuteDelta = minuteDelta
          }

          // if out-of-bounds, revert when done, and vice versa.
          eventElement.draggable("option", "revert", !isInBounds)
        },
        stop: function (ev, ui) {
          clearOverlays()
          trigger("eventDragStop", eventElement, event, ev, ui)

          if (isInBounds && (isAllDay || dayDelta || minuteDelta)) {
            // changed!
            eventDrop(
              this,
              event,
              dayDelta,
              isAllDay ? 0 : minuteDelta,
              isAllDay,
              ev,
              ui,
            )
          } else {
            // either no change or out-of-bounds (draggable has already reverted)

            // reset states for next time, and for updateUI()
            isInBounds = true
            isAllDay = false
            colDelta = 0
            dayDelta = 0
            minuteDelta = 0

            updateUI()
            eventElement.css("filter", "") // clear IE opacity side-effects

            // sometimes fast drags make event revert to wrong position, so reset.
            // also, if we dragged the element out of the area because of snapping,
            // but the *mouse* is still in bounds, we need to reset the position.
            eventElement.css(origPosition)

            showEvents(event, eventElement)
          }
        },
      })

      function updateUI() {
        clearOverlays()
        if (isInBounds) {
          if (isAllDay) {
            timeElement.hide()
            eventElement.draggable("option", "grid", null) // disable grid snapping
            renderDayOverlay(
              addDays(cloneDate(event.start), dayDelta),
              addDays(exclEndDay(event), dayDelta),
            )
          } else {
            updateTimeText(minuteDelta)
            timeElement.css("display", "") // show() was causing display=inline
            eventElement.draggable("option", "grid", [colWidth, snapHeight]) // re-enable grid snapping
          }
        }
      }

      function updateTimeText(minuteDelta) {
        const newStart = addMinutes(cloneDate(event.start), minuteDelta)
        let newEnd
        if (event.end) {
          newEnd = addMinutes(cloneDate(event.end), minuteDelta)
        }
        timeElement.text(formatDates(newStart, newEnd, opt("timeFormat")))
      }
    }

    /* Resizing
	--------------------------------------------------------------------------------------*/

    function resizableSlotEvent(event, eventElement, timeElement) {
      let snapDelta
      let prevSnapDelta
      const snapHeight = getSnapHeight()
      const snapMinutes = getSnapMinutes()
      eventElement.resizable({
        handles: {
          s: ".ui-resizable-handle",
        },
        grid: snapHeight,
        start: function (ev, ui) {
          snapDelta = prevSnapDelta = 0
          hideEvents(event, eventElement)
          trigger("eventResizeStart", this, event, ev, ui)
        },
        resize: (ev, ui) => {
          // don't rely on ui.size.height, doesn't take grid into account
          snapDelta = Math.round(
            (Math.max(snapHeight, eventElement.height()) -
              ui.originalSize.height) /
              snapHeight,
          )
          if (snapDelta !== prevSnapDelta) {
            timeElement.text(
              formatDates(
                event.start,
                !snapDelta && !event.end
                  ? null
                  : // no change, so don't display time range
                    addMinutes(eventEnd(event), snapMinutes * snapDelta),
                opt("timeFormat"),
              ),
            )
            prevSnapDelta = snapDelta
          }
        },
        stop: function (ev, ui) {
          trigger("eventResizeStop", this, event, ev, ui)
          if (snapDelta) {
            eventResize(this, event, 0, snapMinutes * snapDelta, ev, ui)
          } else {
            showEvents(event, eventElement)
            // BUG: if event was really short, need to put title back in span
          }
        },
      })
    }
  }

  /* Agenda Event Segment Utilities
-----------------------------------------------------------------------------*/

  // Sets the seg.backwardCoord and seg.forwardCoord on each segment and returns a new
  // list in the order they should be placed into the DOM (an implicit z-index).
  function placeSlotSegs(segs) {
    const levels = buildSlotSegLevels(segs)
    const level0 = levels[0]
    let i

    computeForwardSlotSegs(levels)

    if (level0) {
      for (i = 0; i < level0.length; i++) {
        computeSlotSegPressures(level0[i])
      }

      for (i = 0; i < level0.length; i++) {
        computeSlotSegCoords(level0[i], 0, 0)
      }
    }

    return flattenSlotSegLevels(levels)
  }

  // Builds an array of segments "levels". The first level will be the leftmost tier of segments
  // if the calendar is left-to-right, or the rightmost if the calendar is right-to-left.
  function buildSlotSegLevels(segs) {
    const levels = []
    let i
    let seg
    let j

    for (i = 0; i < segs.length; i++) {
      seg = segs[i]

      // go through all the levels and stop on the first level where there are no collisions
      for (j = 0; j < levels.length; j++) {
        if (!computeSlotSegCollisions(seg, levels[j]).length) {
          break
        }
      }
      ;(levels[j] || (levels[j] = [])).push(seg)
    }

    return levels
  }

  // For every segment, figure out the other segments that are in subsequent
  // levels that also occupy the same vertical space. Accumulate in seg.forwardSegs
  function computeForwardSlotSegs(levels) {
    let i
    let level
    let j
    let seg
    let k

    for (i = 0; i < levels.length; i++) {
      level = levels[i]

      for (j = 0; j < level.length; j++) {
        seg = level[j]

        seg.forwardSegs = []
        for (k = i + 1; k < levels.length; k++) {
          computeSlotSegCollisions(seg, levels[k], seg.forwardSegs)
        }
      }
    }
  }

  // Figure out which path forward (via seg.forwardSegs) results in the longest path until
  // the furthest edge is reached. The number of segments in this path will be seg.forwardPressure
  function computeSlotSegPressures(seg) {
    const forwardSegs = seg.forwardSegs
    let forwardPressure = 0
    let i
    let forwardSeg

    if (seg.forwardPressure === undefined) {
      // not already computed

      for (i = 0; i < forwardSegs.length; i++) {
        forwardSeg = forwardSegs[i]

        // figure out the child's maximum forward path
        computeSlotSegPressures(forwardSeg)

        // either use the existing maximum, or use the child's forward pressure
        // plus one (for the forwardSeg itself)
        forwardPressure = Math.max(
          forwardPressure,
          1 + forwardSeg.forwardPressure,
        )
      }

      seg.forwardPressure = forwardPressure
    }
  }

  // Calculate seg.forwardCoord and seg.backwardCoord for the segment, where both values range
  // from 0 to 1. If the calendar is left-to-right, the seg.backwardCoord maps to "left" and
  // seg.forwardCoord maps to "right" (via percentage). Vice-versa if the calendar is right-to-left.
  //
  // The segment might be part of a "series", which means consecutive segments with the same pressure
  // who's width is unknown until an edge has been hit. `seriesBackwardPressure` is the number of
  // segments behind this one in the current series, and `seriesBackwardCoord` is the starting
  // coordinate of the first segment in the series.
  function computeSlotSegCoords(
    seg,
    seriesBackwardPressure,
    seriesBackwardCoord,
  ) {
    const forwardSegs = seg.forwardSegs
    let i

    if (seg.forwardCoord === undefined) {
      // not already computed

      if (!forwardSegs.length) {
        // if there are no forward segments, this segment should butt up against the edge
        seg.forwardCoord = 1
      } else {
        // sort highest pressure first
        forwardSegs.sort(compareForwardSlotSegs)

        // this segment's forwardCoord will be calculated from the backwardCoord of the
        // highest-pressure forward segment.
        computeSlotSegCoords(
          forwardSegs[0],
          seriesBackwardPressure + 1,
          seriesBackwardCoord,
        )
        seg.forwardCoord = forwardSegs[0].backwardCoord
      }

      // calculate the backwardCoord from the forwardCoord. consider the series
      seg.backwardCoord =
        seg.forwardCoord -
        (seg.forwardCoord - seriesBackwardCoord) / // available width for series
          (seriesBackwardPressure + 1) // # of segments in the series

      // use this segment's coordinates to computed the coordinates of the less-pressurized
      // forward segments
      for (i = 0; i < forwardSegs.length; i++) {
        computeSlotSegCoords(forwardSegs[i], 0, seg.forwardCoord)
      }
    }
  }

  // Outputs a flat array of segments, from lowest to highest level
  function flattenSlotSegLevels(levels) {
    const segs = []
    let i
    let level
    let j

    for (i = 0; i < levels.length; i++) {
      level = levels[i]

      for (j = 0; j < level.length; j++) {
        segs.push(level[j])
      }
    }

    return segs
  }

  // Find all the segments in `otherSegs` that vertically collide with `seg`.
  // Append into an optionally-supplied `results` array and return.
  function computeSlotSegCollisions(seg, otherSegs, results) {
    results = results || []

    for (let i = 0; i < otherSegs.length; i++) {
      if (isSlotSegCollision(seg, otherSegs[i])) {
        results.push(otherSegs[i])
      }
    }

    return results
  }

  // Do these segments occupy the same vertical space?
  function isSlotSegCollision(seg1, seg2) {
    return seg1.end > seg2.start && seg1.start < seg2.end
  }

  // A cmp function for determining which forward segment to rely on more when computing coordinates.
  function compareForwardSlotSegs(seg1, seg2) {
    // put higher-pressure first
    return (
      seg2.forwardPressure - seg1.forwardPressure ||
      // put segments that are closer to initial edge first (and favor ones with no coords yet)
      (seg1.backwardCoord || 0) - (seg2.backwardCoord || 0) ||
      // do normal sorting...
      compareSlotSegs(seg1, seg2)
    )
  }

  // A cmp function for determining which segment should be closer to the initial edge
  // (the left edge on a left-to-right calendar).
  function compareSlotSegs(seg1, seg2) {
    return (
      seg1.start - seg2.start || // earlier start time goes first
      seg2.end - seg2.start - (seg1.end - seg1.start) || // tie? longer-duration goes first
      (seg1.event.title || "").localeCompare(seg2.event.title)
    ) // tie? alphabetically by title
  }

  function View(element, calendar, viewName) {
    const t = this

    // exports
    t.element = element
    t.calendar = calendar
    t.name = viewName
    t.opt = opt
    t.trigger = trigger
    t.isEventDraggable = isEventDraggable
    t.isEventResizable = isEventResizable
    t.setEventData = setEventData
    t.clearEventData = clearEventData
    t.eventEnd = eventEnd
    t.reportEventElement = reportEventElement
    t.triggerEventDestroy = triggerEventDestroy
    t.eventElementHandlers = eventElementHandlers
    t.showEvents = showEvents
    t.hideEvents = hideEvents
    t.eventDrop = eventDrop
    t.eventResize = eventResize
    // t.title
    // t.start, t.end
    // t.visStart, t.visEnd

    // imports
    const defaultEventEnd = t.defaultEventEnd
    const normalizeEvent = calendar.normalizeEvent // in EventManager
    const reportEventChange = calendar.reportEventChange

    // locals
    let eventsByID = {} // eventID mapped to array of events (there can be multiple b/c of repeating events)
    let eventElementsByID = {} // eventID mapped to array of jQuery elements
    let eventElementCouples = [] // array of objects, { event, element } // TODO: unify with segment system
    const options = calendar.options

    function opt(name, viewNameOverride) {
      const v = options[name]
      if ($.isPlainObject(v)) {
        return smartProperty(v, viewNameOverride || viewName)
      }
      return v
    }

    function trigger(name, thisObj) {
      return calendar.trigger.apply(
        calendar,
        [name, thisObj || t].concat(Array.prototype.slice.call(arguments, 2), [
          t,
        ]),
      )
    }

    /* Event Editable Boolean Calculations
	------------------------------------------------------------------------------*/

    function isEventDraggable(event) {
      const source = event.source || {}
      return (
        firstDefined(
          event.startEditable,
          source.startEditable,
          opt("eventStartEditable"),
          event.editable,
          source.editable,
          opt("editable"),
        ) && !opt("disableDragging")
      ) // deprecated
    }

    function isEventResizable(event) {
      // but also need to make sure the seg.isEnd == true
      const source = event.source || {}
      return (
        firstDefined(
          event.durationEditable,
          source.durationEditable,
          opt("eventDurationEditable"),
          event.editable,
          source.editable,
          opt("editable"),
        ) && !opt("disableResizing")
      ) // deprecated
    }

    /* Event Data
	------------------------------------------------------------------------------*/

    function setEventData(events) {
      // events are already normalized at this point
      eventsByID = {}
      let i
      const len = events.length
      let event
      for (i = 0; i < len; i++) {
        event = events[i]
        if (eventsByID[event._id]) {
          eventsByID[event._id].push(event)
        } else {
          eventsByID[event._id] = [event]
        }
      }
    }

    function clearEventData() {
      eventsByID = {}
      eventElementsByID = {}
      eventElementCouples = []
    }

    // returns a Date object for an event's end
    function eventEnd(event) {
      return event.end ? cloneDate(event.end) : defaultEventEnd(event)
    }

    /* Event Elements
	------------------------------------------------------------------------------*/

    // report when view creates an element for an event
    function reportEventElement(event, element) {
      eventElementCouples.push({ event: event, element: element })
      if (eventElementsByID[event._id]) {
        eventElementsByID[event._id].push(element)
      } else {
        eventElementsByID[event._id] = [element]
      }
    }

    function triggerEventDestroy() {
      $.each(eventElementCouples, (i, couple) => {
        t.trigger("eventDestroy", couple.event, couple.event, couple.element)
      })
    }

    // attaches eventClick, eventMouseover, eventMouseout
    function eventElementHandlers(event, eventElement) {
      eventElement
        .click(function (ev) {
          if (
            !eventElement.hasClass("ui-draggable-dragging") &&
            !eventElement.hasClass("ui-resizable-resizing")
          ) {
            return trigger("eventClick", this, event, ev)
          }
        })
        .hover(
          function (ev) {
            trigger("eventMouseover", this, event, ev)
          },
          function (ev) {
            trigger("eventMouseout", this, event, ev)
          },
        )
      // TODO: don't fire eventMouseover/eventMouseout *while* dragging is occuring (on subject element)
      // TODO: same for resizing
    }

    function showEvents(event, exceptElement) {
      eachEventElement(event, exceptElement, "show")
    }

    function hideEvents(event, exceptElement) {
      eachEventElement(event, exceptElement, "hide")
    }

    function eachEventElement(event, exceptElement, funcName) {
      // NOTE: there may be multiple events per ID (repeating events)
      // and multiple segments per event
      const elements = eventElementsByID[event._id]
      let i
      const len = elements.length
      for (i = 0; i < len; i++) {
        if (!exceptElement || elements[i][0] !== exceptElement[0]) {
          elements[i][funcName]()
        }
      }
    }

    /* Event Modification Reporting
	---------------------------------------------------------------------------------*/

    function eventDrop(e, event, dayDelta, minuteDelta, allDay, ev, ui) {
      const oldAllDay = event.allDay
      const eventId = event._id
      moveEvents(eventsByID[eventId], dayDelta, minuteDelta, allDay)
      trigger(
        "eventDrop",
        e,
        event,
        dayDelta,
        minuteDelta,
        allDay,
        () => {
          // TODO: investigate cases where this inverse technique might not work
          moveEvents(eventsByID[eventId], -dayDelta, -minuteDelta, oldAllDay)
          reportEventChange(eventId)
        },
        ev,
        ui,
      )
      reportEventChange(eventId)
    }

    function eventResize(e, event, dayDelta, minuteDelta, ev, ui) {
      const eventId = event._id
      elongateEvents(eventsByID[eventId], dayDelta, minuteDelta)
      trigger(
        "eventResize",
        e,
        event,
        dayDelta,
        minuteDelta,
        () => {
          // TODO: investigate cases where this inverse technique might not work
          elongateEvents(eventsByID[eventId], -dayDelta, -minuteDelta)
          reportEventChange(eventId)
        },
        ev,
        ui,
      )
      reportEventChange(eventId)
    }

    /* Event Modification Math
	---------------------------------------------------------------------------------*/

    function moveEvents(events, dayDelta, minuteDelta, allDay) {
      minuteDelta = minuteDelta || 0
      for (let e, len = events.length, i = 0; i < len; i++) {
        e = events[i]
        if (allDay !== undefined) {
          e.allDay = allDay
        }
        addMinutes(addDays(e.start, dayDelta, true), minuteDelta)
        if (e.end) {
          e.end = addMinutes(addDays(e.end, dayDelta, true), minuteDelta)
        }
        normalizeEvent(e, options)
      }
    }

    function elongateEvents(events, dayDelta, minuteDelta) {
      minuteDelta = minuteDelta || 0
      for (let e, len = events.length, i = 0; i < len; i++) {
        e = events[i]
        e.end = addMinutes(addDays(eventEnd(e), dayDelta, true), minuteDelta)
        normalizeEvent(e, options)
      }
    }

    // ====================================================================================================
    // Utilities for day "cells"
    // ====================================================================================================
    // The "basic" views are completely made up of day cells.
    // The "agenda" views have day cells at the top "all day" slot.
    // This was the obvious common place to put these utilities, but they should be abstracted out into
    // a more meaningful class (like DayEventRenderer).
    // ====================================================================================================

    // For determining how a given "cell" translates into a "date":
    //
    // 1. Convert the "cell" (row and column) into a "cell offset" (the # of the cell, cronologically from the first).
    //    Keep in mind that column indices are inverted with isRTL. This is taken into account.
    //
    // 2. Convert the "cell offset" to a "day offset" (the # of days since the first visible day in the view).
    //
    // 3. Convert the "day offset" into a "date" (a JavaScript Date object).
    //
    // The reverse transformation happens when transforming a date into a cell.

    // exports
    t.isHiddenDay = isHiddenDay
    t.skipHiddenDays = skipHiddenDays
    t.getCellsPerWeek = getCellsPerWeek
    t.dateToCell = dateToCell
    t.dateToDayOffset = dateToDayOffset
    t.dayOffsetToCellOffset = dayOffsetToCellOffset
    t.cellOffsetToCell = cellOffsetToCell
    t.cellToDate = cellToDate
    t.cellToCellOffset = cellToCellOffset
    t.cellOffsetToDayOffset = cellOffsetToDayOffset
    t.dayOffsetToDate = dayOffsetToDate
    t.rangeToSegments = rangeToSegments

    // internals
    const hiddenDays = opt("hiddenDays") || [] // array of day-of-week indices that are hidden
    const isHiddenDayHash = [] // is the day-of-week hidden? (hash with day-of-week-index -> bool)
    let cellsPerWeek
    const dayToCellMap = [] // hash from dayIndex -> cellIndex, for one week
    const cellToDayMap = [] // hash from cellIndex -> dayIndex, for one week
    const isRTL = opt("isRTL")

    // initialize important internal variables
    ;(() => {
      if (opt("weekends") === false) {
        hiddenDays.push(0, 6) // 0=sunday, 6=saturday
      }

      // Loop through a hypothetical week and determine which
      // days-of-week are hidden. Record in both hashes (one is the reverse of the other).
      for (let dayIndex = 0, cellIndex = 0; dayIndex < 7; dayIndex++) {
        dayToCellMap[dayIndex] = cellIndex
        isHiddenDayHash[dayIndex] = $.inArray(dayIndex, hiddenDays) !== -1
        if (!isHiddenDayHash[dayIndex]) {
          cellToDayMap[cellIndex] = dayIndex
          cellIndex++
        }
      }

      cellsPerWeek = cellIndex
      if (!cellsPerWeek) {
        throw "invalid hiddenDays" // all days were hidden? bad.
      }
    })()

    // Is the current day hidden?
    // `day` is a day-of-week index (0-6), or a Date object
    function isHiddenDay(day) {
      if (typeof day === "object") {
        day = day.getDay()
      }
      return isHiddenDayHash[day]
    }

    function getCellsPerWeek() {
      return cellsPerWeek
    }

    // Keep incrementing the current day until it is no longer a hidden day.
    // If the initial value of `date` is not a hidden day, don't do anything.
    // Pass `isExclusive` as `true` if you are dealing with an end date.
    // `inc` defaults to `1` (increment one day forward each time)
    function skipHiddenDays(date, inc, isExclusive) {
      inc = inc || 1
      while (
        isHiddenDayHash[(date.getDay() + (isExclusive ? inc : 0) + 7) % 7]
      ) {
        addDays(date, inc)
      }
    }

    //
    // TRANSFORMATIONS: cell -> cell offset -> day offset -> date
    //

    // cell -> date (combines all transformations)
    // Possible arguments:
    // - row, col
    // - { row:#, col: # }
    function cellToDate() {
      const cellOffset = cellToCellOffset.apply(null, arguments)
      const dayOffset = cellOffsetToDayOffset(cellOffset)
      const date = dayOffsetToDate(dayOffset)
      return date
    }

    // cell -> cell offset
    // Possible arguments:
    // - row, col
    // - { row:#, col:# }
    function cellToCellOffset(row, col) {
      const colCnt = t.getColCnt()

      // rtl variables. wish we could pre-populate these. but where?
      const dis = isRTL ? -1 : 1
      const dit = isRTL ? colCnt - 1 : 0

      if (typeof row === "object") {
        col = row.col
        row = row.row
      }
      const cellOffset = row * colCnt + (col * dis + dit) // column, adjusted for RTL (dis & dit)

      return cellOffset
    }

    // cell offset -> day offset
    function cellOffsetToDayOffset(cellOffset) {
      const day0 = t.visStart.getDay() // first date's day of week
      cellOffset += dayToCellMap[day0] // normlize cellOffset to beginning-of-week
      return (
        Math.floor(cellOffset / cellsPerWeek) * 7 + // # of days from full weeks
        cellToDayMap[ // # of days from partial last week
          ((cellOffset % cellsPerWeek) + cellsPerWeek) % cellsPerWeek // crazy math to handle negative cellOffsets
        ] -
        day0
      ) // adjustment for beginning-of-week normalization
    }

    // day offset -> date (JavaScript Date object)
    function dayOffsetToDate(dayOffset) {
      const date = cloneDate(t.visStart)
      addDays(date, dayOffset)
      return date
    }

    //
    // TRANSFORMATIONS: date -> day offset -> cell offset -> cell
    //

    // date -> cell (combines all transformations)
    function dateToCell(date) {
      const dayOffset = dateToDayOffset(date)
      const cellOffset = dayOffsetToCellOffset(dayOffset)
      const cell = cellOffsetToCell(cellOffset)
      return cell
    }

    // date -> day offset
    function dateToDayOffset(date) {
      return dayDiff(date, t.visStart)
    }

    // day offset -> cell offset
    function dayOffsetToCellOffset(dayOffset) {
      const day0 = t.visStart.getDay() // first date's day of week
      dayOffset += day0 // normalize dayOffset to beginning-of-week
      return (
        Math.floor(dayOffset / 7) * cellsPerWeek + // # of cells from full weeks
        dayToCellMap[ // # of cells from partial last week
          ((dayOffset % 7) + 7) % 7 // crazy math to handle negative dayOffsets
        ] -
        dayToCellMap[day0]
      ) // adjustment for beginning-of-week normalization
    }

    // cell offset -> cell (object with row & col keys)
    function cellOffsetToCell(cellOffset) {
      const colCnt = t.getColCnt()

      // rtl variables. wish we could pre-populate these. but where?
      const dis = isRTL ? -1 : 1
      const dit = isRTL ? colCnt - 1 : 0

      const row = Math.floor(cellOffset / colCnt)
      const col = (((cellOffset % colCnt) + colCnt) % colCnt) * dis + dit // column, adjusted for RTL (dis & dit)
      return {
        row: row,
        col: col,
      }
    }

    //
    // Converts a date range into an array of segment objects.
    // "Segments" are horizontal stretches of time, sliced up by row.
    // A segment object has the following properties:
    // - row
    // - cols
    // - isStart
    // - isEnd
    //
    function rangeToSegments(startDate, endDate) {
      const rowCnt = t.getRowCnt()
      const colCnt = t.getColCnt()
      const segments = [] // array of segments to return

      // day offset for given date range
      const rangeDayOffsetStart = dateToDayOffset(startDate)
      const rangeDayOffsetEnd = dateToDayOffset(endDate) // exclusive

      // first and last cell offset for the given date range
      // "last" implies inclusivity
      const rangeCellOffsetFirst = dayOffsetToCellOffset(rangeDayOffsetStart)
      const rangeCellOffsetLast = dayOffsetToCellOffset(rangeDayOffsetEnd) - 1

      // loop through all the rows in the view
      for (let row = 0; row < rowCnt; row++) {
        // first and last cell offset for the row
        const rowCellOffsetFirst = row * colCnt
        const rowCellOffsetLast = rowCellOffsetFirst + colCnt - 1

        // get the segment's cell offsets by constraining the range's cell offsets to the bounds of the row
        const segmentCellOffsetFirst = Math.max(
          rangeCellOffsetFirst,
          rowCellOffsetFirst,
        )
        const segmentCellOffsetLast = Math.min(
          rangeCellOffsetLast,
          rowCellOffsetLast,
        )

        // make sure segment's offsets are valid and in view
        if (segmentCellOffsetFirst <= segmentCellOffsetLast) {
          // translate to cells
          const segmentCellFirst = cellOffsetToCell(segmentCellOffsetFirst)
          const segmentCellLast = cellOffsetToCell(segmentCellOffsetLast)

          // view might be RTL, so order by leftmost column
          const cols = [segmentCellFirst.col, segmentCellLast.col].sort()

          // Determine if segment's first/last cell is the beginning/end of the date range.
          // We need to compare "day offset" because "cell offsets" are often ambiguous and
          // can translate to multiple days, and an edge case reveals itself when we the
          // range's first cell is hidden (we don't want isStart to be true).
          const isStart =
            cellOffsetToDayOffset(segmentCellOffsetFirst) ===
            rangeDayOffsetStart
          const isEnd =
            cellOffsetToDayOffset(segmentCellOffsetLast) + 1 ===
            rangeDayOffsetEnd // +1 for comparing exclusively

          segments.push({
            row: row,
            leftCol: cols[0],
            rightCol: cols[1],
            isStart: isStart,
            isEnd: isEnd,
          })
        }
      }

      return segments
    }
  }

  function DayEventRenderer() {
    const t = this

    // exports
    t.renderDayEvents = renderDayEvents
    t.draggableDayEvent = draggableDayEvent // made public so that subclasses can override
    t.resizableDayEvent = resizableDayEvent // "

    // imports
    const opt = t.opt
    const trigger = t.trigger
    const isEventDraggable = t.isEventDraggable
    const isEventResizable = t.isEventResizable
    const eventEnd = t.eventEnd
    const reportEventElement = t.reportEventElement
    const eventElementHandlers = t.eventElementHandlers
    const showEvents = t.showEvents
    const hideEvents = t.hideEvents
    const eventDrop = t.eventDrop
    const eventResize = t.eventResize
    const getRowCnt = t.getRowCnt
    const getColCnt = t.getColCnt
    const getColWidth = t.getColWidth
    const allDayRow = t.allDayRow // TODO: rename
    const colLeft = t.colLeft
    const colRight = t.colRight
    const colContentLeft = t.colContentLeft
    const colContentRight = t.colContentRight
    const dateToCell = t.dateToCell
    const getDaySegmentContainer = t.getDaySegmentContainer
    const formatDates = t.calendar.formatDates
    const renderDayOverlay = t.renderDayOverlay
    const clearOverlays = t.clearOverlays
    const clearSelection = t.clearSelection
    const getHoverListener = t.getHoverListener
    const rangeToSegments = t.rangeToSegments
    const cellToDate = t.cellToDate
    const cellToCellOffset = t.cellToCellOffset
    const cellOffsetToDayOffset = t.cellOffsetToDayOffset
    const dateToDayOffset = t.dateToDayOffset
    const dayOffsetToCellOffset = t.dayOffsetToCellOffset

    // Render `events` onto the calendar, attach mouse event handlers, and call the `eventAfterRender` callback for each.
    // Mouse event will be lazily applied, except if the event has an ID of `modifiedEventId`.
    // Can only be called when the event container is empty (because it wipes out all innerHTML).
    function renderDayEvents(events, modifiedEventId) {
      // do the actual rendering. Receive the intermediate "segment" data structures.
      const segments = _renderDayEvents(
        events,
        false, // don't append event elements
        true, // set the heights of the rows
      )

      // report the elements to the View, for general drag/resize utilities
      segmentElementEach(segments, (segment, element) => {
        reportEventElement(segment.event, element)
      })

      // attach mouse handlers
      attachHandlers(segments, modifiedEventId)

      // call `eventAfterRender` callback for each event
      segmentElementEach(segments, (segment, element) => {
        trigger("eventAfterRender", segment.event, segment.event, element)
      })
    }

    // Render an event on the calendar, but don't report them anywhere, and don't attach mouse handlers.
    // Append this event element to the event container, which might already be populated with events.
    // If an event's segment will have row equal to `adjustRow`, then explicitly set its top coordinate to `adjustTop`.
    // This hack is used to maintain continuity when user is manually resizing an event.
    // Returns an array of DOM elements for the event.
    function renderTempDayEvent(event, adjustRow, adjustTop) {
      // actually render the event. `true` for appending element to container.
      // Recieve the intermediate "segment" data structures.
      const segments = _renderDayEvents(
        [event],
        true, // append event elements
        false, // don't set the heights of the rows
      )

      const elements = []

      // Adjust certain elements' top coordinates
      segmentElementEach(segments, (segment, element) => {
        if (segment.row === adjustRow) {
          element.css("top", adjustTop)
        }
        elements.push(element[0]) // accumulate DOM nodes
      })

      return elements
    }

    // Render events onto the calendar. Only responsible for the VISUAL aspect.
    // Not responsible for attaching handlers or calling callbacks.
    // Set `doAppend` to `true` for rendering elements without clearing the existing container.
    // Set `doRowHeights` to allow setting the height of each row, to compensate for vertical event overflow.
    function _renderDayEvents(events, doAppend, doRowHeights) {
      // where the DOM nodes will eventually end up
      const finalContainer = getDaySegmentContainer()

      // the container where the initial HTML will be rendered.
      // If `doAppend`==true, uses a temporary container.
      const renderContainer = doAppend ? $("<div/>") : finalContainer

      const segments = buildSegments(events)
      let html
      let elements

      // calculate the desired `left` and `width` properties on each segment object
      calculateHorizontals(segments)

      // build the HTML string. relies on `left` property
      html = buildHTML(segments)

      // render the HTML. innerHTML is considerably faster than jQuery's .html()
      renderContainer[0].innerHTML = html

      // retrieve the individual elements
      elements = renderContainer.children()

      // if we were appending, and thus using a temporary container,
      // re-attach elements to the real container.
      if (doAppend) {
        finalContainer.append(elements)
      }

      // assigns each element to `segment.event`, after filtering them through user callbacks
      resolveElements(segments, elements)

      // Calculate the left and right padding+margin for each element.
      // We need this for setting each element's desired outer width, because of the W3C box model.
      // It's important we do this in a separate pass from acually setting the width on the DOM elements
      // because alternating reading/writing dimensions causes reflow for every iteration.
      segmentElementEach(segments, (segment, element) => {
        segment.hsides = hsides(element, true) // include margins = `true`
      })

      // Set the width of each element
      segmentElementEach(segments, (segment, element) => {
        element.width(Math.max(0, segment.outerWidth - segment.hsides))
      })

      // Grab each element's outerHeight (setVerticals uses this).
      // To get an accurate reading, it's important to have each element's width explicitly set already.
      segmentElementEach(segments, (segment, element) => {
        segment.outerHeight = element.outerHeight(true) // include margins = `true`
      })

      // Set the top coordinate on each element (requires segment.outerHeight)
      setVerticals(segments, doRowHeights)

      return segments
    }

    // Generate an array of "segments" for all events.
    function buildSegments(events) {
      const segments = []
      for (let i = 0; i < events.length; i++) {
        const eventSegments = buildSegmentsForEvent(events[i])
        segments.push.apply(segments, eventSegments) // append an array to an array
      }
      return segments
    }

    // Generate an array of segments for a single event.
    // A "segment" is the same data structure that View.rangeToSegments produces,
    // with the addition of the `event` property being set to reference the original event.
    function buildSegmentsForEvent(event) {
      const startDate = event.start
      const endDate = exclEndDay(event)
      const segments = rangeToSegments(startDate, endDate)
      for (let i = 0; i < segments.length; i++) {
        segments[i].event = event
      }
      return segments
    }

    // Sets the `left` and `outerWidth` property of each segment.
    // These values are the desired dimensions for the eventual DOM elements.
    function calculateHorizontals(segments) {
      const isRTL = opt("isRTL")
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]

        // Determine functions used for calulating the elements left/right coordinates,
        // depending on whether the view is RTL or not.
        // NOTE:
        // colLeft/colRight returns the coordinate butting up the edge of the cell.
        // colContentLeft/colContentRight is indented a little bit from the edge.
        const leftFunc = (isRTL ? segment.isEnd : segment.isStart)
          ? colContentLeft
          : colLeft
        const rightFunc = (isRTL ? segment.isStart : segment.isEnd)
          ? colContentRight
          : colRight

        const left = leftFunc(segment.leftCol)
        const right = rightFunc(segment.rightCol)
        segment.left = left
        segment.outerWidth = right - left
      }
    }

    // Build a concatenated HTML string for an array of segments
    function buildHTML(segments) {
      let html = ""
      for (let i = 0; i < segments.length; i++) {
        html += buildHTMLForSegment(segments[i])
      }
      return html
    }

    // Build an HTML string for a single segment.
    // Relies on the following properties:
    // - `segment.event` (from `buildSegmentsForEvent`)
    // - `segment.left` (from `calculateHorizontals`)
    function buildHTMLForSegment(segment) {
      let html = ""
      const isRTL = opt("isRTL")
      const event = segment.event
      const url = event.url

      // generate the list of CSS classNames
      let classNames = ["fc-event", "fc-event-hori"]
      if (isEventDraggable(event)) {
        classNames.push("fc-event-draggable")
      }
      if (segment.isStart) {
        classNames.push("fc-event-start")
      }
      if (segment.isEnd) {
        classNames.push("fc-event-end")
      }
      // use the event's configured classNames
      // guaranteed to be an array via `normalizeEvent`
      classNames = classNames.concat(event.className)
      if (event.source) {
        // use the event's source's classNames, if specified
        classNames = classNames.concat(event.source.className || [])
      }

      // generate a semicolon delimited CSS string for any of the "skin" properties
      // of the event object (`backgroundColor`, `borderColor` and such)
      const skinCss = getSkinCss(event, opt)

      if (url) {
        html += `<a href='${htmlEscape(url)}'`
      } else {
        html += "<div"
      }
      html += ` class='${classNames.join(" ")}' style='position:absolute;left:${segment.left}px;${skinCss}'><div class='fc-event-inner'>`
      if (!event.allDay && segment.isStart) {
        html += `<span class='fc-event-time'>${htmlEscape(
          formatDates(event.start, event.end, opt("timeFormat")),
        )}</span>`
      }
      html += `<span class='fc-event-title'>${htmlEscape(event.title || "")}</span></div>`
      if (segment.isEnd && isEventResizable(event)) {
        html += `<div class='ui-resizable-handle ui-resizable-${isRTL ? "w" : "e"}'>&nbsp;&nbsp;&nbsp;</div>`
      }
      html += `</${url ? "a" : "div"}>`

      // TODO:
      // When these elements are initially rendered, they will be briefly visibile on the screen,
      // even though their widths/heights are not set.
      // SOLUTION: initially set them as visibility:hidden ?

      return html
    }

    // Associate each segment (an object) with an element (a jQuery object),
    // by setting each `segment.element`.
    // Run each element through the `eventRender` filter, which allows developers to
    // modify an existing element, supply a new one, or cancel rendering.
    function resolveElements(segments, elements) {
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        const event = segment.event
        let element = elements.eq(i)

        // call the trigger with the original element
        let triggerRes = trigger("eventRender", event, event, element)

        if (triggerRes === false) {
          // if `false`, remove the event from the DOM and don't assign it to `segment.event`
          element.remove()
        } else {
          if (triggerRes && triggerRes !== true) {
            // the trigger returned a new element, but not `true` (which means keep the existing element)

            // re-assign the important CSS dimension properties that were already assigned in `buildHTMLForSegment`
            triggerRes = $(triggerRes).css({
              position: "absolute",
              left: segment.left,
            })

            element.replaceWith(triggerRes)
            element = triggerRes
          }

          segment.element = element
        }
      }
    }

    /* Top-coordinate Methods
	-------------------------------------------------------------------------------------------------*/

    // Sets the "top" CSS property for each element.
    // If `doRowHeights` is `true`, also sets each row's first cell to an explicit height,
    // so that if elements vertically overflow, the cell expands vertically to compensate.
    function setVerticals(segments, doRowHeights) {
      const rowContentHeights = calculateVerticals(segments) // also sets segment.top
      const rowContentElements = getRowContentElements() // returns 1 inner div per row
      const rowContentTops = []

      // Set each row's height by setting height of first inner div
      if (doRowHeights) {
        for (let i = 0; i < rowContentElements.length; i++) {
          rowContentElements[i].height(rowContentHeights[i])
        }
      }

      // Get each row's top, relative to the views's origin.
      // Important to do this after setting each row's height.
      for (let i = 0; i < rowContentElements.length; i++) {
        rowContentTops.push(rowContentElements[i].position().top)
      }

      // Set each segment element's CSS "top" property.
      // Each segment object has a "top" property, which is relative to the row's top, but...
      segmentElementEach(segments, (segment, element) => {
        element.css(
          "top",
          rowContentTops[segment.row] + segment.top, // ...now, relative to views's origin
        )
      })
    }

    // Calculate the "top" coordinate for each segment, relative to the "top" of the row.
    // Also, return an array that contains the "content" height for each row
    // (the height displaced by the vertically stacked events in the row).
    // Requires segments to have their `outerHeight` property already set.
    function calculateVerticals(segments) {
      const rowCnt = getRowCnt()
      const colCnt = getColCnt()
      const rowContentHeights = [] // content height for each row
      const segmentRows = buildSegmentRows(segments) // an array of segment arrays, one for each row

      for (let rowI = 0; rowI < rowCnt; rowI++) {
        const segmentRow = segmentRows[rowI]

        // an array of running total heights for each column.
        // initialize with all zeros.
        const colHeights = []
        for (let colI = 0; colI < colCnt; colI++) {
          colHeights.push(0)
        }

        // loop through every segment
        for (let segmentI = 0; segmentI < segmentRow.length; segmentI++) {
          const segment = segmentRow[segmentI]

          // find the segment's top coordinate by looking at the max height
          // of all the columns the segment will be in.
          segment.top = arrayMax(
            colHeights.slice(
              segment.leftCol,
              segment.rightCol + 1, // make exclusive for slice
            ),
          )

          // adjust the columns to account for the segment's height
          for (let colI = segment.leftCol; colI <= segment.rightCol; colI++) {
            colHeights[colI] = segment.top + segment.outerHeight
          }
        }

        // the tallest column in the row should be the "content height"
        rowContentHeights.push(arrayMax(colHeights))
      }

      return rowContentHeights
    }

    // Build an array of segment arrays, each representing the segments that will
    // be in a row of the grid, sorted by which event should be closest to the top.
    function buildSegmentRows(segments) {
      const rowCnt = getRowCnt()
      const segmentRows = []
      let segmentI
      let segment
      let rowI

      // group segments by row
      for (segmentI = 0; segmentI < segments.length; segmentI++) {
        segment = segments[segmentI]
        rowI = segment.row
        if (segment.element) {
          // was rendered?
          if (segmentRows[rowI]) {
            // already other segments. append to array
            segmentRows[rowI].push(segment)
          } else {
            // first segment in row. create new array
            segmentRows[rowI] = [segment]
          }
        }
      }

      // sort each row
      for (rowI = 0; rowI < rowCnt; rowI++) {
        segmentRows[rowI] = sortSegmentRow(
          segmentRows[rowI] || [], // guarantee an array, even if no segments
        )
      }

      return segmentRows
    }

    // Sort an array of segments according to which segment should appear closest to the top
    function sortSegmentRow(segments) {
      const sortedSegments = []

      // build the subrow array
      const subrows = buildSegmentSubrows(segments)

      // flatten it
      for (let i = 0; i < subrows.length; i++) {
        sortedSegments.push.apply(sortedSegments, subrows[i]) // append an array to an array
      }

      return sortedSegments
    }

    // Take an array of segments, which are all assumed to be in the same row,
    // and sort into subrows.
    function buildSegmentSubrows(segments) {
      // Give preference to elements with certain criteria, so they have
      // a chance to be closer to the top.
      segments.sort(compareDaySegments)

      const subrows = []
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]

        // loop through subrows, starting with the topmost, until the segment
        // doesn't collide with other segments.
        for (let j = 0; j < subrows.length; j++) {
          if (!isDaySegmentCollision(segment, subrows[j])) {
            break
          }
        }
        // `j` now holds the desired subrow index
        if (subrows[j]) {
          subrows[j].push(segment)
        } else {
          subrows[j] = [segment]
        }
      }

      return subrows
    }

    // Return an array of jQuery objects for the placeholder content containers of each row.
    // The content containers don't actually contain anything, but their dimensions should match
    // the events that are overlaid on top.
    function getRowContentElements() {
      let i
      const rowCnt = getRowCnt()
      const rowDivs = []
      for (i = 0; i < rowCnt; i++) {
        rowDivs[i] = allDayRow(i).find("div.fc-day-content > div")
      }
      return rowDivs
    }

    /* Mouse Handlers
	---------------------------------------------------------------------------------------------------*/
    // TODO: better documentation!

    function attachHandlers(segments, modifiedEventId) {
      const segmentContainer = getDaySegmentContainer()

      segmentElementEach(segments, (segment, element, i) => {
        const event = segment.event
        if (event._id === modifiedEventId) {
          bindDaySeg(event, element, segment)
        } else {
          element[0]._fci = i // for lazySegBind
        }
      })

      lazySegBind(segmentContainer, segments, bindDaySeg)
    }

    function bindDaySeg(event, eventElement, segment) {
      if (isEventDraggable(event)) {
        t.draggableDayEvent(event, eventElement, segment) // use `t` so subclasses can override
      }

      if (
        segment.isEnd && // only allow resizing on the final segment for an event
        isEventResizable(event)
      ) {
        t.resizableDayEvent(event, eventElement, segment) // use `t` so subclasses can override
      }

      // attach all other handlers.
      // needs to be after, because resizableDayEvent might stopImmediatePropagation on click
      eventElementHandlers(event, eventElement)
    }

    function draggableDayEvent(event, eventElement) {
      const hoverListener = getHoverListener()
      let dayDelta
      eventElement.draggable({
        delay: 50,
        opacity: opt("dragOpacity"),
        revertDuration: opt("dragRevertDuration"),
        start: (ev, ui) => {
          trigger("eventDragStart", eventElement, event, ev, ui)
          hideEvents(event, eventElement)
          hoverListener.start(
            (cell, origCell, rowDelta, colDelta) => {
              eventElement.draggable(
                "option",
                "revert",
                !cell || (!rowDelta && !colDelta),
              )
              clearOverlays()
              if (cell) {
                const origDate = cellToDate(origCell)
                const date = cellToDate(cell)
                dayDelta = dayDiff(date, origDate)
                renderDayOverlay(
                  addDays(cloneDate(event.start), dayDelta),
                  addDays(exclEndDay(event), dayDelta),
                )
              } else {
                dayDelta = 0
              }
            },
            ev,
            "drag",
          )
        },
        stop: function (ev, ui) {
          hoverListener.stop()
          clearOverlays()
          trigger("eventDragStop", eventElement, event, ev, ui)
          if (dayDelta) {
            eventDrop(this, event, dayDelta, 0, event.allDay, ev, ui)
          } else {
            eventElement.css("filter", "") // clear IE opacity side-effects
            showEvents(event, eventElement)
          }
        },
      })
    }

    function resizableDayEvent(event, element, segment) {
      const isRTL = opt("isRTL")
      const direction = isRTL ? "w" : "e"
      const handle = element.find(`.ui-resizable-${direction}`) // TODO: stop using this class because we aren't using jqui for this
      let isResizing = false

      // TODO: look into using jquery-ui mouse widget for this stuff
      disableTextSelection(element) // prevent native <a> selection for IE
      element
        .mousedown((ev) => {
          // prevent native <a> selection for others
          ev.preventDefault()
        })
        .click((ev) => {
          if (isResizing) {
            ev.preventDefault() // prevent link from being visited (only method that worked in IE6)
            ev.stopImmediatePropagation() // prevent fullcalendar eventClick handler from being called
            // (eventElementHandlers needs to be bound after resizableDayEvent)
          }
        })

      handle.mousedown(function (ev) {
        if (ev.which !== 1) {
          return // needs to be left mouse button
        }
        isResizing = true
        const hoverListener = getHoverListener()
        const rowCnt = getRowCnt()
        const colCnt = getColCnt()
        const elementTop = element.css("top")
        let dayDelta
        let helpers
        const eventCopy = $.extend({}, event)
        const minCellOffset = dayOffsetToCellOffset(
          dateToDayOffset(event.start),
        )
        clearSelection()
        $("body").css("cursor", `${direction}-resize`).one("mouseup", mouseup)
        trigger("eventResizeStart", this, event, ev)
        hoverListener.start((cell, origCell) => {
          if (cell) {
            const origCellOffset = cellToCellOffset(origCell)
            let cellOffset = cellToCellOffset(cell)

            // don't let resizing move earlier than start date cell
            cellOffset = Math.max(cellOffset, minCellOffset)

            dayDelta =
              cellOffsetToDayOffset(cellOffset) -
              cellOffsetToDayOffset(origCellOffset)

            if (dayDelta) {
              eventCopy.end = addDays(eventEnd(event), dayDelta, true)
              const oldHelpers = helpers

              helpers = renderTempDayEvent(eventCopy, segment.row, elementTop)
              helpers = $(helpers) // turn array into a jQuery object

              helpers.find("*").css("cursor", `${direction}-resize`)
              if (oldHelpers) {
                oldHelpers.remove()
              }

              hideEvents(event)
            } else {
              if (helpers) {
                showEvents(event)
                helpers.remove()
                helpers = null
              }
            }
            clearOverlays()
            renderDayOverlay(
              // coordinate grid already rebuilt with hoverListener.start()
              event.start,
              addDays(exclEndDay(event), dayDelta),
              // TODO: instead of calling renderDayOverlay() with dates,
              // call _renderDayOverlay (or whatever) with cell offsets.
            )
          }
        }, ev)

        function mouseup(ev) {
          trigger("eventResizeStop", this, event, ev)
          $("body").css("cursor", "")
          hoverListener.stop()
          clearOverlays()
          if (dayDelta) {
            eventResize(this, event, dayDelta, 0, ev)
            // event redraw will clear helpers
          }
          // otherwise, the drag handler already restored the old events

          setTimeout(() => {
            // make this happen after the element's click event
            isResizing = false
          }, 0)
        }
      })
    }
  }

  /* Generalized Segment Utilities
-------------------------------------------------------------------------------------------------*/

  function isDaySegmentCollision(segment, otherSegments) {
    for (let i = 0; i < otherSegments.length; i++) {
      const otherSegment = otherSegments[i]
      if (
        otherSegment.leftCol <= segment.rightCol &&
        otherSegment.rightCol >= segment.leftCol
      ) {
        return true
      }
    }
    return false
  }

  function segmentElementEach(segments, callback) {
    // TODO: use in AgendaView?
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const element = segment.element
      if (element) {
        callback(segment, element, i)
      }
    }
  }

  // A cmp function for determining which segments should appear higher up
  function compareDaySegments(a, b) {
    return (
      b.rightCol - b.leftCol - (a.rightCol - a.leftCol) || // put wider events first
      b.event.allDay - a.event.allDay || // if tie, put all-day events first (booleans cast to 0/1)
      a.event.start - b.event.start || // if a tie, sort by event start date
      (a.event.title || "").localeCompare(b.event.title)
    ) // if a tie, sort by event title
  }

  //BUG: unselect needs to be triggered when events are dragged+dropped

  function SelectionManager() {
    const t = this

    // exports
    t.select = select
    t.unselect = unselect
    t.reportSelection = reportSelection
    t.daySelectionMousedown = daySelectionMousedown

    // imports
    const opt = t.opt
    const trigger = t.trigger
    const defaultSelectionEnd = t.defaultSelectionEnd
    const renderSelection = t.renderSelection
    const clearSelection = t.clearSelection

    // locals
    let selected = false

    // unselectAuto
    if (opt("selectable") && opt("unselectAuto")) {
      $(document).mousedown((ev) => {
        const ignore = opt("unselectCancel")
        if (ignore) {
          if ($(ev.target).parents(ignore).length) {
            // could be optimized to stop after first match
            return
          }
        }
        unselect(ev)
      })
    }

    function select(startDate, endDate, allDay) {
      unselect()
      if (!endDate) {
        endDate = defaultSelectionEnd(startDate, allDay)
      }
      renderSelection(startDate, endDate, allDay)
      reportSelection(startDate, endDate, allDay)
    }

    function unselect(ev) {
      if (selected) {
        selected = false
        clearSelection()
        trigger("unselect", null, ev)
      }
    }

    function reportSelection(startDate, endDate, allDay, ev) {
      selected = true
      trigger("select", null, startDate, endDate, allDay, ev)
    }

    function daySelectionMousedown(ev) {
      // not really a generic manager method, oh well
      const cellToDate = t.cellToDate
      const getIsCellAllDay = t.getIsCellAllDay
      const hoverListener = t.getHoverListener()
      const reportDayClick = t.reportDayClick // this is hacky and sort of weird
      if (ev.which === 1 && opt("selectable")) {
        // which==1 means left mouse button
        unselect(ev)
        let dates
        hoverListener.start((cell, origCell) => {
          // TODO: maybe put cellToDate/getIsCellAllDay info in cell
          clearSelection()
          if (cell && getIsCellAllDay(cell)) {
            dates = [cellToDate(origCell), cellToDate(cell)].sort(dateCompare)
            renderSelection(dates[0], dates[1], true)
          } else {
            dates = null
          }
        }, ev)
        $(document).one("mouseup", (ev) => {
          hoverListener.stop()
          if (dates) {
            if (+dates[0] === +dates[1]) {
              reportDayClick(dates[0], true, ev)
            }
            reportSelection(dates[0], dates[1], true, ev)
          }
        })
      }
    }
  }

  function OverlayManager() {
    // exports
    this.renderOverlay = renderOverlay
    this.clearOverlays = clearOverlays

    // locals
    const usedOverlays = []
    const unusedOverlays = []

    function renderOverlay(rect, parent) {
      let e = unusedOverlays.shift()
      if (!e) {
        e = $(
          "<div class='fc-cell-overlay' style='position:absolute;z-index:3'/>",
        )
      }
      if (e[0].parentNode !== parent[0]) {
        e.appendTo(parent)
      }
      usedOverlays.push(e.css(rect).show())
      return e
    }

    function clearOverlays() {
      let e
      while ((e = usedOverlays.shift())) {
        unusedOverlays.push(e.hide().unbind())
      }
    }
  }

  function CoordinateGrid(buildFunc) {
    let rows
    let cols

    this.build = () => {
      rows = []
      cols = []
      buildFunc(rows, cols)
    }

    this.cell = (x, y) => {
      const rowCnt = rows.length
      const colCnt = cols.length
      let i
      let r = -1
      let c = -1
      for (i = 0; i < rowCnt; i++) {
        if (y >= rows[i][0] && y < rows[i][1]) {
          r = i
          break
        }
      }
      for (i = 0; i < colCnt; i++) {
        if (x >= cols[i][0] && x < cols[i][1]) {
          c = i
          break
        }
      }
      return r >= 0 && c >= 0 ? { row: r, col: c } : null
    }

    this.rect = (row0, col0, row1, col1, originElement) => {
      // row1,col1 is inclusive
      const origin = originElement.offset()
      return {
        top: rows[row0][0] - origin.top,
        left: cols[col0][0] - origin.left,
        width: cols[col1][1] - cols[col0][0],
        height: rows[row1][1] - rows[row0][0],
      }
    }
  }

  function HoverListener(coordinateGrid) {
    let bindType
    let change
    let firstCell
    let cell

    this.start = (_change, ev, _bindType) => {
      change = _change
      firstCell = cell = null
      coordinateGrid.build()
      mouse(ev)
      bindType = _bindType || "mousemove"
      $(document).bind(bindType, mouse)
    }

    function mouse(ev) {
      _fixUIEvent(ev) // see below
      const newCell = coordinateGrid.cell(ev.pageX, ev.pageY)
      if (
        !newCell !== !cell ||
        (newCell && (newCell.row !== cell.row || newCell.col !== cell.col))
      ) {
        if (newCell) {
          if (!firstCell) {
            firstCell = newCell
          }
          change(
            newCell,
            firstCell,
            newCell.row - firstCell.row,
            newCell.col - firstCell.col,
          )
        } else {
          change(newCell, firstCell)
        }
        cell = newCell
      }
    }

    this.stop = () => {
      $(document).unbind(bindType, mouse)
      return cell
    }
  }

  // this fix was only necessary for jQuery UI 1.8.16 (and jQuery 1.7 or 1.7.1)
  // upgrading to jQuery UI 1.8.17 (and using either jQuery 1.7 or 1.7.1) fixed the problem
  // but keep this in here for 1.8.16 users
  // and maybe remove it down the line

  function _fixUIEvent(event) {
    // for issue 1168
    if (event.pageX === undefined) {
      event.pageX = event.originalEvent.pageX
      event.pageY = event.originalEvent.pageY
    }
  }

  function HorizontalPositionCache(getElement) {
    let elements = {}
    let lefts = {}
    let rights = {}

    function e(i) {
      return (elements[i] = elements[i] || getElement(i))
    }

    this.left = (i) =>
      (lefts[i] = lefts[i] === undefined ? e(i).position().left : lefts[i])

    this.right = (i) =>
      (rights[i] =
        rights[i] === undefined ? this.left(i) + e(i).width() : rights[i])

    this.clear = () => {
      elements = {}
      lefts = {}
      rights = {}
    }
  }
})(jQuery)
