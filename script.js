let apiRef = null;

document.addEventListener("DOMContentLoaded", async () => {
  const filterButtons = document.querySelectorAll(".filter-btn");
  const galleryRows = document.querySelectorAll(".gallery-row");
  const mainContainer = document.querySelector(".timeline-container");
  const landingEl = document.querySelector(".landing");
  
  const munitionsButtons = document.querySelectorAll(".munitions-btn");
  const munitionsItems = document.querySelectorAll(".gallery-row[data-category='munitions']");
  const munitionsFilter = document.querySelector(".munitions-filter");
  
  const navigationButtons = document.querySelectorAll(".navigation-btn");
  const navigationItems = document.querySelectorAll(".gallery-row[data-category='navigation']");
  const navigationFilter = document.querySelector(".navigation-filter");

  // =========================================================
  //  1. MUNITIONS SUB-FILTER BUTTONS
  // =========================================================
  munitionsButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();

      munitionsButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      const subFilter = button.getAttribute("data-subfilter");

      // DOM Row Filtering
      munitionsItems.forEach((item) => {
        const subCat = item.getAttribute("data-subCategory");
        if (subFilter === "all" || subCat === subFilter) {
          item.classList.remove("hidden");
        } else {
          item.classList.add("hidden");
        }
      });

      if (typeof lightbox !== "undefined") {
        lightbox.reload();
      }

      // 3D View Triggers
      if (subFilter === "mun-1") {
        focusComponentXRay("warheads", 0.1);
      } else if (subFilter === "mun-2") {
        showHiddenComponent("Missile", [-1.44, 2.15, 0.69], [0.25, -0.05, -0.03]);
      } else if (subFilter === "mun-3") {
        showHiddenComponent("Munitions", [1.8, 0.7, -0.8], [-0.2, -0.75, 0]);
      } else {
        resetMaterialOpacities();
      }
    });
  });

  // =========================================================
  //  2. NAVIGATION SUB-FILTER BUTTONS
  // =========================================================
  navigationButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();

      navigationButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      const subFilter = button.getAttribute("data-subfilter");

      // DOM Row Filtering
      navigationItems.forEach((item) => {
        const subCat = item.getAttribute("data-subCategory");
        if (subFilter === "all" || subCat === subFilter) {
          item.classList.remove("hidden");
        } else {
          item.classList.add("hidden");
        }
      });

      if (typeof lightbox !== "undefined") {
        lightbox.reload();
      }

      // 3D View Triggers
      resetMaterialOpacities(); // Ensure standard opacity when switching nav modes

      if (subFilter === "nav-1") {
        // Flight Control
        highlightNavigation();
      } else if (subFilter === "nav-2") {
        // Satellite Navigation ("SatNav")
        highlightSatNav();
      } else {
        resetMaterialOpacities();
      }
    });
  });

  // =========================================================
  //  3. CSV DATA & IMAGE WRAPPERS
  // =========================================================
  let sourcesMap = {};
  try {
    const response = await fetch("drone-sources.csv");
    const csvText = await response.text();
    sourcesMap = parseCSV(csvText);
  } catch (error) {
    console.error("Could not load sources.csv:", error);
  }

  galleryRows.forEach((row) => {
    const images = row.querySelectorAll("img");

    images.forEach((img) => {
      const imageSrc = img.getAttribute("src");
      const match = sourcesMap[imageSrc];

      img.classList.remove("glightbox", "glightbox-active");

      const anchor = document.createElement("a");
      anchor.setAttribute("href", imageSrc);
      anchor.classList.add("glightbox");

      img.parentNode.insertBefore(anchor, img);
      anchor.appendChild(img);

      if (match) {
        img.setAttribute("alt", match.source_text);
        anchor.setAttribute("data-description", match.source_text);

        const figcaption = anchor.nextElementSibling;
        if (figcaption && figcaption.classList.contains("dynamic-caption")) {
          figcaption.innerHTML = `<a href="${match.link}" target="_blank" rel="noopener noreferrer">${match.source_text}</a>`;
        }
      }
    });
  });

  const lightbox = GLightbox({
    selector: ".glightbox-active",
    loop: true,
    openEffect: "zoom",
    closeEffect: "zoom",
  });

  // =========================================================
  //  4. MAIN FILTER CONTROLLER
  // =========================================================
  function applyFilter(filterValue) {
    // Munitions Sub-Menu Control
    if (munitionsFilter) {
      if (filterValue === "munitions") {
        munitionsFilter.style.display = "flex";

        munitionsButtons.forEach((btn) => {
          btn.classList.toggle("active", btn.getAttribute("data-subfilter") === "mun-1");
        });

        focusComponentXRay("warheads", 0.1);
      } else {
        munitionsFilter.style.display = "none";
        resetMaterialOpacities();
      }
    }

    // Navigation Sub-Menu Control
    if (navigationFilter) {
      if (filterValue === "navigation") {
        navigationFilter.style.display = "flex";

        navigationButtons.forEach((btn) => {
          btn.classList.toggle("active", btn.getAttribute("data-subfilter") === "nav-1");
        });

        highlightNavigation();
      } else {
        navigationFilter.style.display = "none";
      }
    }

    // Landing Page State
    if (!filterValue || filterValue === "none") {
      if (landingEl) landingEl.style.display = "block";
      galleryRows.forEach((row) => row.classList.add("hidden"));
      lightbox.reload();
      return;
    }

    if (landingEl) landingEl.style.display = "none";

    // Row Visibility & Lightbox Sync
    galleryRows.forEach((row) => {
      const category = row.getAttribute("data-category");
      const subCat = row.getAttribute("data-subCategory");
      const anchors = row.querySelectorAll(".glightbox");

      let activeSubFilter = "all";
      if (category === "munitions" && munitionsButtons.length > 0) {
        const activeBtn = document.querySelector(".munitions-btn.active");
        if (activeBtn) activeSubFilter = activeBtn.getAttribute("data-subfilter");
      } else if (category === "navigation" && navigationButtons.length > 0) {
        const activeBtn = document.querySelector(".navigation-btn.active");
        if (activeBtn) activeSubFilter = activeBtn.getAttribute("data-subfilter");
      }

      const matchesCategory = filterValue === "all" || category === filterValue;
      const matchesSubCategory = activeSubFilter === "all" || subCat === activeSubFilter;

      if (matchesCategory && matchesSubCategory) {
        row.classList.remove("hidden");
        anchors.forEach((anchor) => anchor.classList.add("glightbox-active"));
      } else {
        row.classList.add("hidden");
        anchors.forEach((anchor) => anchor.classList.remove("glightbox-active"));
      }
    });

    if (typeof lightbox !== "undefined") {
      lightbox.reload();
    }
  }

  const initialActiveButton = document.querySelector(".filter-btn.active");
  if (initialActiveButton) {
    applyFilter(initialActiveButton.getAttribute("data-filter"));
  } else {
    applyFilter("none");
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      applyFilter(button.getAttribute("data-filter"));

      if (mainContainer) {
        mainContainer.scrollTo({ top: 0 });
      }
    });
  });

  function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    const result = {};

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = [];
      let currentColumn = "";
      let insideQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];

        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
          columns.push(currentColumn.trim());
          currentColumn = "";
        } else {
          currentColumn += char;
        }
      }
      columns.push(currentColumn.trim());

      let image = columns[0] || "";
      let source_text = columns[1] || "";
      let link = columns[2] || "";

      if (image) {
        result[image] = { source_text, link };
      }
    }
    return result;
  }

  // =========================================================
  //  5. SKETCHFAB INITIALIZATION
  // =========================================================
  const iframe = document.getElementById("drone-model");
  const modelUID = "10382bef344c4a88abb4d1723b339fd4";

  if (iframe && window.Sketchfab) {
    const client = new window.Sketchfab("1.12.1", iframe);

    client.init(modelUID, {
      success: function onSuccess(api) {
        api.start();
        api.addEventListener("viewerready", () => {
          console.log("Sketchfab 3D Viewer is ready!");
          apiRef = api;

          // Camera Logger for development
          apiRef.addEventListener("camerastop", () => {
            apiRef.getCameraLookAt((err, camera) => {
              if (err || !camera) return;
              const pos = camera.position.map((n) => Number(n.toFixed(2)));
              const target = camera.target.map((n) => Number(n.toFixed(2)));
              console.log(`📸 Camera Position: [${pos.join(", ")}]`);
              console.log(`📸 Camera Target:   [${target.join(", ")}]`);
            });
          });

          // Hides Missile & Munitions immediately on load
          apiRef.getMaterialList(function (err, materials) {
            if (err || !materials) return;
            materials.forEach((mat) => {
              if (mat.channels && mat.channels.Opacity) {
                const matName = mat.name.toLowerCase();
                if (matName === "missile" || matName === "munitions") {
                  mat.channels.Opacity.enable = true;
                  mat.channels.Opacity.factor = 0.0;
                  apiRef.setMaterial(mat);
                }
              }
            });
          });
        });
      },
      error: function onError() {
        console.error("Sketchfab API failed to initialize.");
      },
      autostart: 1,
      transparent: 1,
      ui_watermark: 0,
      ui_help: 0,
      ui_settings: 0,
      camera: 1,
      preload: 1,
      ui_stop: 0,
      ui_animations: 0,
      ui_annotations: 0,
      ui_controls: 0,
      ui_fullscreen: 0,
      ui_general_controls: 0,
      ui_hint: 0,
      ui_infos: 0,
      ui_inspector: 0,
      ui_vr: 1,
      ui_watermark_link: 0,
    });
  } else {
    console.warn("Sketchfab script missing or target iframe not found.");
  }
});

// =========================================================
//  6. CORE SKETCHFAB HIGHLIGHT & CAMERA WRAPPERS
// =========================================================

function highlightComponent(materialName, cameraPos, cameraTarget, displayName) {
  if (!apiRef) {
    console.warn("Sketchfab API is not loaded yet.");
    return;
  }

  apiRef.setCameraLookAt(cameraPos, cameraTarget, 2);

  apiRef.setHighlightOptions({
    outlineWidth: 2,
    outlineColor: [1, 0.1, 0.1],
    outlineDuration: 200,
    highlightColor: [1, 0.1, 0.1],
    highlightDuration: 200,
  });

  apiRef.getMaterialList(function (err, materials) {
    if (err || !materials) return;

    const targetMaterial = materials.find(
      (m) => m.name.toLowerCase() === materialName.toLowerCase()
    );

    if (targetMaterial) {
      apiRef.highlightMaterial(targetMaterial);
    } else {
      console.warn(`Material "${materialName}" not found`);
    }
  });
}

function highlightAirframe(materialName = "Frame") {
  highlightComponent(materialName, [0, 3, 3], [0, 0, 0], "Frame");
}

function highlightPropulsion(materialName = "propulsion") {
  highlightComponent(materialName, [-0.86, -3.2, 1.17], [0, -2, 0], "Propulsion");
}

function highlightNavigation(materialName = "Navigation") {
  highlightComponent(materialName, [1, 0.73, 3.09], [0.02, -0.49, -0.11], "Flight Control");
}

function highlightSatNav(materialName = "SatNav") {
  // Update camera coordinates [Pos], [Target] using console logger
  highlightComponent(materialName, [0.6, 0.07, 0.61], [0.47, -0.38, 0.15], "Satellite Navigation");
}

function highlightCommunication(materialName = "Communications") {
  highlightComponent(materialName, [2.29, -2.37, 0.38], [-0.4, -0.63, -0.62], "Communication");
}

// =========================================================
//  7. OPACITY TRANSITION HELPERS
// =========================================================

const currentOpacities = new Map();
let activeFadeInterval = null;

function fadeOpacities(getFinalTargetFactor, duration = 500) {
  if (!apiRef) return;

  if (activeFadeInterval) {
    clearInterval(activeFadeInterval);
  }

  apiRef.getMaterialList(function (err, materials) {
    if (err || !materials) return;

    materials.forEach((mat) => {
      const matName = mat.name.toLowerCase();
      if (!currentOpacities.has(matName)) {
        currentOpacities.set(matName, mat.channels?.Opacity?.factor ?? 1.0);
      }
    });

    const items = materials
      .map((mat) => {
        const matName = mat.name.toLowerCase();
        const startFactor = currentOpacities.get(matName);
        const targetFactor = getFinalTargetFactor(matName);

        return {
          material: mat,
          matName: matName,
          start: startFactor,
          target: targetFactor,
          needsUpdate: Math.abs(startFactor - targetFactor) > 0.01,
        };
      })
      .filter((item) => item.needsUpdate);

    if (items.length === 0) return;

    const steps = 8;
    const stepDuration = Math.max(duration / steps, 30);
    let currentStep = 0;

    activeFadeInterval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      items.forEach(({ material, matName, start, target }) => {
        if (material.channels && material.channels.Opacity) {
          const currentFactor = start + (target - start) * progress;

          currentOpacities.set(matName, currentFactor);
          material.channels.Opacity.enable = true;
          material.channels.Opacity.factor = currentFactor;

          try {
            apiRef.setMaterial(material);
          } catch (e) {
            console.warn("Material update skipped:", e);
          }
        }
      });

      if (currentStep >= steps) {
        clearInterval(activeFadeInterval);
      }
    }, stepDuration);
  });
}

function resetMaterialOpacities() {
  fadeOpacities((matName) => {
    if (matName === "missile" || matName === "munitions") return 0.0;
    return 1.0;
  }, 500);
}

function focusComponentXRay(targetMaterialName = "warheads", ghostOpacity = 0.1) {
  highlightComponent(
    targetMaterialName,
    [-0.02, 1.98, 0.53],
    [-0.01, -0.19, -0.64],
    targetMaterialName
  );

  fadeOpacities((matName) => {
    const isTarget =
      matName === targetMaterialName.toLowerCase() ||
      matName === "warheads" ||
      matName === "warhead";

    if (isTarget) return 1.0;
    if (matName === "missile" || matName === "munitions") return 0.0;
    return ghostOpacity;
  }, 500);
}

function showHiddenComponent(targetMaterialName, cameraPos, cameraTarget) {
  highlightComponent(targetMaterialName, cameraPos, cameraTarget, targetMaterialName);

  fadeOpacities((matName) => {
    const isTarget = matName === targetMaterialName.toLowerCase();
    if (isTarget) return 1.0;
    if (matName === "missile" || matName === "munitions") return 0.0;
    return 1.0;
  }, 500);
}
