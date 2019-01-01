(function() {
  let imageNumber = 1;
  let frame = document.getElementById("photo-frame");
  const overlays = document.querySelectorAll(".overlay");
  const filePicker = document.getElementById("file-picker");
  const saveFrameButton = document.getElementById("save-frame");
  const loadFrameButton = document.getElementById("load-frame");
  const rotateFrameButton = document.getElementById("rotate-button");
  const toggleOverlayButton = document.getElementById("toggle-overlay");

  const mouseMoves$ = Rx.Observable.fromEvent(window, "mousemove");
  const mouseUp$ = Rx.Observable.fromEvent(frame, "mouseup");
  const filePickerChanges$ = Rx.Observable.fromEvent(filePicker, "change");
  const saveFrameClicks$ = Rx.Observable.fromEvent(saveFrameButton, "click");
  const loadFrameClicks$ = Rx.Observable.fromEvent(loadFrameButton, "click");
  const overlayButtonClicks$ = Rx.Observable.fromEvent(
    toggleOverlayButton,
    "click"
  );

  const rotateFrameButtonClicks$ = Rx.Observable.fromEvent(
    rotateFrameButton,
    "click"
  );

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
    images.forEach(image => image.parentNode.removeChild(image));

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

  const loadFile$ = filePickerChanges$.map(e => {
    e.preventDefault();
    let image = addImageToCanvas();

    handleMouseMoves(image);
  });

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
  }

  function handleMouseMoves(image) {
    const mousedown$ = Rx.Observable.fromEvent(image, "mousedown");
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
      image.style.left = pageX - canvasX - offsetX + "px";
      image.style.top = pageY - canvasY - offsetY + "px";
    });
  }

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

    const image = document.getElementById(id);
    return image;
  }

  saveFrameClicks$.subscribe(_ => savePhotoFrame());
  loadFrameClicks$.subscribe(_ => loadPhotoFrame());
  overlayButtonClicks$.subscribe(_ => toggleOverlay());
  rotateFrameButtonClicks$.subscribe(_ => toggleOrientation(frame));

  loadFile$.subscribe();
})();
