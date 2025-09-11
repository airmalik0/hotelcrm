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

// ********************************** We can use  This code is for by ID *********************************
;(($) => {
  let fileUploadCount = 0

  $.fn.fileUpload = function () {
    return this.each(function () {
      const fileUploadDiv = $(this)
      const fileUploadId = `fileUpload-${++fileUploadCount}`

      // Creates HTML content for the file upload area.
      const fileDivContent = `
                <label for="${fileUploadId}" class="file-upload image-upload__box">
                    <div class="image-upload__boxInner">
                        <i class="ri-gallery-line image-upload__icon"></i>
                        <p class="text-xs text-secondary-light mt-1 mb-0">Drag & drop image here</p>
                    </div>
                    <input type="file" id="${fileUploadId}" name="[]" multiple hidden />
                </label>
            `

      fileUploadDiv.html(fileDivContent).addClass("file-container")

      // Adds the information of uploaded files to file upload area.
      function handleFiles(files) {
        if (files.length > 0) {
          const file = files[0] // Assuming only one file is selected

          const fileName = file.name
          const fileSize = `${(file.size / 1024).toFixed(2)} KB`
          const fileType = file.type
          const preview = fileType.startsWith("image")
            ? `<img src="${URL.createObjectURL(file)}" alt="${fileName}" class="image-upload__image" height="30">`
            : ` <span class="image-upload__anotherFileIcon"> <i class="fas fa-file"></i></span>`

          // Update the content of the file upload area
          const fileUploadLabel = fileUploadDiv.find("label.file-upload")
          fileUploadLabel.find(".image-upload__boxInner").html(`
                        ${preview}
                        <button type="button" class="image-upload__deleteBtn"><i class="ri-close-line"></i></button>
                    `)

          // Attach a click event to the "Delete" button
          fileUploadLabel.find(".image-upload__deleteBtn").click(() => {
            fileUploadDiv.html(fileDivContent)
            initializeFileUpload()
          })
        }
      }

      function initializeFileUpload() {
        // Events triggered after dragging files.
        fileUploadDiv.on({
          dragover: (e) => {
            e.preventDefault()
            fileUploadDiv.toggleClass("dragover", e.type === "dragover")
          },
          drop: (e) => {
            e.preventDefault()
            fileUploadDiv.removeClass("dragover")
            handleFiles(e.originalEvent.dataTransfer.files)
          },
        })

        // Event triggered when file is selected.
        fileUploadDiv
          .find(`label.file-upload input[type="file"]`)
          .change(function () {
            handleFiles(this.files)
          })
      }

      initializeFileUpload()
    })
  }
})(jQuery)

// Apply fileUpload functionality to each container with the class "fileUpload"
$(".fileUpload").fileUpload()
