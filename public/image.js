(function() {
  let imageNumber = 1;

  // #region DOMSelections
  let frame = document.getElementById("photo-frame");
  const overlays = document.querySelectorAll(".overlay");
  const filePicker = document.getElementById("file-picker");
  const saveFrameButton = document.getElementById("save-frame");
  const loadFrameButton = document.getElementById("load-frame");
  const rotateFrameButton = document.getElementById("rotate-button");
  const toggleOverlayButton = document.getElementById("toggle-overlay");
  const downloadImageButton = document.getElementById("save-file");
  // #endregion DOMSelections

  // #region ObservableCreations
  const keyUp$ = Rx.Observable.fromEvent(window, "keyup");
  const deletePresses$ = keyUp$.filter(e => e.code == "Backspace");
  const windowClicks$ = Rx.Observable.fromEvent(document, "click");
  const mouseMoves$ = Rx.Observable.fromEvent(window, "mousemove");
  const mouseUp$ = Rx.Observable.fromEvent(frame, "mouseup");
  const filePickerChanges$ = Rx.Observable.fromEvent(filePicker, "change");
  const saveFrameClicks$ = Rx.Observable.fromEvent(saveFrameButton, "click");
  const loadFrameClicks$ = Rx.Observable.fromEvent(loadFrameButton, "click");
  const overlayButtonClicks$ = Rx.Observable.fromEvent(
    toggleOverlayButton,
    "click"
  );
  const downloadClicks$ = Rx.Observable.fromEvent(downloadImageButton, "click");

  const rotateFrameButtonClicks$ = Rx.Observable.fromEvent(
    rotateFrameButton,
    "click"
  );
  // #endregion ObservableCreations

  // #region canvasRotation
  function isPortrait(el) {
    return el.clientWidth < el.clientHeight;
  }

  function toggleOrientation(el) {
    if (el.className.indexOf("landscape-orientation") > -1) {
      el.classList.remove("landscape-orientation");
    } else {
      el.classList.add("landscape-orientation");
    }
    switchOverlay();
  }

  // #endregion canvasRotation
  // #region overlay
  function switchOverlay() {
    let [portraitOverlay, landscapeOverlay] = overlays;
    if (
      portraitOverlay.classList.contains("off") &&
      landscapeOverlay.classList.contains("off")
    )
      return;
    if (!portraitOverlay.classList.contains("off")) {
      portraitOverlay.classList.add("off");
      landscapeOverlay.classList.remove("off");
    } else {
      portraitOverlay.classList.remove("off");
      landscapeOverlay.classList.add("off");
    }
  }

  function toggleOverlay() {
    let [portraitOverlay, landscapeOverlay] = overlays;
    if (isPortrait(frame)) {
      if (portraitOverlay.classList.contains("off")) {
        portraitOverlay.classList.remove("off");
      } else {
        portraitOverlay.classList.add("off");
      }
      if (!landscapeOverlay.classList.contains("off")) {
        landscapeOverlay.classList.add("off");
      }
    } else {
      if (landscapeOverlay.classList.contains("off")) {
        landscapeOverlay.classList.remove("off");
      } else {
        landscapeOverlay.classList.add("off");
      }
      if (!portraitOverlay.classList.contains("off")) {
        portraitOverlay.classList.add("off");
      }
    }
  }
  // #endregion overlay

  // #region checkPointAndLoadPhotoFrame
  function savePhotoFrame() {
    let overlayStatuses = Array.from(overlays, overlay => overlay.className);
    let photos = Array.from(document.querySelectorAll(".img"), photo => {
      let { classList, src, id, style } = photo;
      classList = Array.from(classList);
      let { top, left, position, cursor } = style;
      if (top === "") {
        top = "0px";
      }
      if (left === "") {
        left = "0px";
      }

      return {
        classList,
        src,
        id,
        top,
        left,
        position,
        cursor
      };
    });

    photos = JSON.stringify(photos);
    localStorage.setItem("photos", photos);
    localStorage.setItem("frame-className", frame.className);
    localStorage.setItem("overlay-statuses", JSON.stringify(overlayStatuses));
  }

  function loadPhotoFrame() {
    const images = frame.querySelectorAll("img");
    images.forEach(img => img.parentNode.removeChild(img));

    const photos = JSON.parse(localStorage.getItem("photos"));
    frame.className = localStorage.getItem("frame-className") || "";
    const [portrait, landscape] = JSON.parse(
      localStorage.getItem("overlay-statuses") || [
        "overlay overlay-landscape off",
        "overlay overlay-landscape off"
      ]
    );
    const [portraitOverlay, landscapeOverlay] = overlays;
    portraitOverlay.className = portrait;
    landscapeOverlay.className = landscape;
    photos.forEach(reloadPhoto);
  }

  function reloadPhoto(photo) {
    const { classList, src, id, top, left, position, cursor } = photo;
    const img = new Image();
    img.src = src;
    img.id = id;
    classList.forEach(c => img.classList.add(c));
    img.style.top = top;
    img.style.left = left;
    img.style.position = position;
    img.style.cursor = cursor;

    frame.appendChild(img);
    handleMouseMoves(img);
    selectImage(img);
  }
  // #endregion checkPointAndLoadPhotoFrame

  // #region loadFile
  const loadFile$ = filePickerChanges$.map(e => {
    e.preventDefault();
    let image = addImageToCanvas();

    handleMouseMoves(image);
    selectImage(image);
  });
  // #endregion loadFile

  // #region addImageToCanvas
  function addImageToCanvas() {
    const reader = new FileReader();

    const files = filePicker.files;
    const file = files[0];

    reader.readAsDataURL(file);

    let img = new Image();
    const src = file.name;
    const id = src + "-" + imageNumber;
    imageNumber++;

    reader.addEventListener(
      "load",
      () => {
        img.src = reader.result;
      },
      false
    );

    const hasloaded = setInterval(() => {
      if (img.naturalHeight) {
        const landscape = img.naturalWidth > img.naturalHeight;
        img.classList.add("img");

        if (landscape) {
          img.classList.add("img-landscape");
        } else {
          img.classList.add("img-portrait");
        }
        clearInterval(hasloaded);
      }
    }, 10);

    img.id = id;
    img.style.position = "absolute";
    img.style.top = 0;
    img.style.left = 0;
    img.style.cursor = "move";

    frame.appendChild(img);

    return document.getElementById(id);
  }
  // #endregion addImageToCanvas

  // #region selectImage
  function selectImage(img) {
    const mouseClick$ = Rx.Observable.fromEvent(img, "click");
    mouseClick$.subscribe(e => {
      Array.from(document.querySelectorAll("img"), el =>
        el.classList.remove("selected")
      );
      e.target.classList.add("selected");
    });
  }
  // #endregion selectImage

  // #region deselectImage
  function deselectImage(e) {
    if (e.target.nodeName !== "IMG") {
      Array.from(document.querySelectorAll("img"), el =>
        el.classList.remove("selected")
      );
    }
  }
  // #endregion deselectImage

  // #region dragImage
  function handleMouseMoves(img) {
    const mousedown$ = Rx.Observable.fromEvent(img, "mousedown");
    const drags = mousedown$.flatMap(md => {
      md.preventDefault();

      const { offsetX, offsetY } = md;

      let canvasX = frame.offsetLeft;
      let canvasY = frame.offsetTop;

      return mouseMoves$
        .map(mm => {
          mm.preventDefault();
          const { pageX, pageY } = mm;
          return {
            pageX,
            pageY,
            canvasX,
            canvasY,
            offsetX,
            offsetY
          };
        })
        .takeUntil(mouseUp$);
    });

    drags.subscribe(e => {
      const { pageX, pageY, canvasX, canvasY, offsetX, offsetY } = e;
      img.style.left = pageX - canvasX - offsetX + "px";
      img.style.top = pageY - canvasY - offsetY + "px";
    });
  }
  // #endregion dragImage

  // #region deleteImage
  function deleteSelectedImage() {
    const img = document.querySelector(".selected");
    if (img !== null) {
      frame.removeChild(img);
    }
  }
  // #endregion deleteImage

  // #region downloadCanvas
  function downloadURI(uri) {
    const link = document.createElement("a");
    link.download = "photo frame.png";
    link.href = uri;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    delete link;
  }

  function downloadImage() {
    const options = {
      width: frame.offsetWidth,
      height: frame.offsetHeight,
      scale: 1,
      logging: false
    };

    html2canvas(frame, options).then(function(canvas) {
      const dataURL = canvas.toDataURL("image/png");
      downloadURI(dataURL);
    });
  }
  // #endregion downloadCanvas

  saveFrameClicks$.subscribe(_ => savePhotoFrame());
  loadFrameClicks$.subscribe(_ => loadPhotoFrame());
  overlayButtonClicks$.subscribe(_ => toggleOverlay());
  rotateFrameButtonClicks$.subscribe(_ => toggleOrientation(frame));
  downloadClicks$.subscribe(downloadImage);
  deletePresses$.subscribe(deleteSelectedImage);
  windowClicks$.subscribe(deselectImage);
  loadFile$.subscribe();
})();
