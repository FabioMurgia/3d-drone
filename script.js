let apiRef = null;
// ___________________________________________
//               API REFs
// ___________________________________________

document.addEventListener("DOMContentLoaded", async () => {
  const filterButtons = document.querySelectorAll(".filter-btn");
  const galleryRows = document.querySelectorAll(".gallery-row");
  const mainContainer = document.querySelector(".timeline-container");
  const landingEl = document.querySelector(".landing");
  const munitionsButtons = document.querySelectorAll(".munitions-btn");
  const munitionsItems = document.querySelectorAll(
    ".gallery-row[data-category='munitions']"
  );
  const munitionsFilter = document.querySelector(".munitions-filter");
  const navigationButtons = document.querySelectorAll(".navigation-btn");
  const navigationItems = document.querySelectorAll(
    ".gallery-row[data-category='navigation']"
  );
  const navigationFilter = document.querySelector(".navigation-filter");

  // =========================================================
  //  INSIDE DOMContentLoaded (Near line 20-40)
  // =========================================================
  munitionsButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();

      munitionsButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      const subFilter = button.getAttribute("data-subfilter");

      // --- 1. DOM ROW FILTERING ---
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

      // --- 2. SUB-FILTER 3D TRIGGERS ---
      if (subFilter === "mun-1") {
        // Warhead: Dims drone to 10%, warhead solid 100%
        focusComponentXRay("warheads", 0.1);
      } else if (subFilter === "mun-2") {
        // Anti-Air Armament: Reveals "Missile" to 100%
        showHiddenComponent("Missile", [-1.44, 2.15, 0.69],
          [0.25, -0.05, -0.03],);
      } else if (subFilter === "mun-3") {
        // Auxiliary Munitions: Reveals "Munitions" to 100%
        showHiddenComponent("Munitions", [1.8, 0.7, -0.8], [-0.2, -0.75, 0]);
      } else {
        // Default / All: Reset opacities
        resetMaterialOpacities();
      }
    });
  });

  navigationButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();

      navigationButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      const subFilter = button.getAttribute("data-subfilter");

      navigationItems.forEach((item) => {
        const subCat = item.getAttribute("data-subCategory");
        if (subFilter === "all" || subCat === subFilter) {
          item.classList.remove("hidden");
        } else {
          item.classList.add("hidden");
        }
      });
      if (typeof lightbox !== "undefined") lightbox.reload();
    });
  });

  // 1. Fetch and Parse the local CSV file
  let sourcesMap = {};
  try {
    const response = await fetch("drone-sources.csv");
    const csvText = await response.text();
    sourcesMap = parseCSV(csvText);
  } catch (error) {
    console.error("Could not load sources.csv:", error);
  }

  // 2. Wrap images and Map CSV data to HTML Elements
  galleryRows.forEach((row) => {
    const images = row.querySelectorAll("img");

    images.forEach((img) => {
      const imageSrc = img.getAttribute("src");
      const match = sourcesMap[imageSrc];

      // --- FIX 1: Strip ONLY lightbox classes, preserving design/styling classes ---
      img.classList.remove("glightbox", "glightbox-active");

      // Create the <a> wrapper tag on the fly
      const anchor = document.createElement("a");
      anchor.setAttribute("href", imageSrc);
      anchor.classList.add("glightbox"); // Just base class, filter handles '-active'

      // Wrap the image
      img.parentNode.insertBefore(anchor, img);
      anchor.appendChild(img);

      if (match) {
        // Set Alt Text on the image automatically
        img.setAttribute("alt", match.source_text);
        // Set GLightbox description on the newly created anchor wrapper
        anchor.setAttribute("data-description", match.source_text);

        // Look for the adjacent figcaption right next to our new anchor wrapper
        const figcaption = anchor.nextElementSibling;
        if (figcaption && figcaption.classList.contains("dynamic-caption")) {
          figcaption.innerHTML = `<a href="${match.link}" target="_blank" rel="noopener noreferrer">${match.source_text}</a>`;
        }
      }
    });
  });

  // 3. Initialize GLightbox
  const lightbox = GLightbox({
    selector: ".glightbox-active",
    loop: true,
    openEffect: "zoom",
    closeEffect: "zoom",
  });

  function applyFilter(filterValue) {
    // 1. SUB-MENU VISIBILITY & 3D TRIGGERS
    if (munitionsFilter) {
      if (filterValue === "munitions") {
        munitionsFilter.style.display = "flex";

        // A. Reset sub-buttons so "Warhead" (mun-1) is active visually
        munitionsButtons.forEach((btn) => {
          if (btn.getAttribute("data-subfilter") === "mun-1") {
            btn.classList.add("active");
          } else {
            btn.classList.remove("active");
          }
        });

        // B. Trigger the Warhead X-Ray view + Highlight
        focusComponentXRay("warheads", 0.1);
      } else {
        munitionsFilter.style.display = "none";
        // Reset opacities back to default when leaving Munitions
        resetMaterialOpacities();
      }
    }

    if (navigationFilter) {
      if (filterValue === "navigation") {
        navigationFilter.style.display = "flex";
      } else {
        navigationFilter.style.display = "none";
      }
    }
    // 2. Landing page check
    if (!filterValue || filterValue === "none") {
      if (landingEl) {
        landingEl.style.display = "block";
      }
      galleryRows.forEach((row) => row.classList.add("hidden"));
      lightbox.reload();
      return; // Safe to return now!
    }

    // 3. Category filtering (runs when a component IS selected)
    if (landingEl) {
      landingEl.style.display = "none";
    }

    galleryRows.forEach((row) => {
      const category = row.getAttribute("data-category");
      const subCat = row.getAttribute("data-subCategory");
      const anchors = row.querySelectorAll(".glightbox");

      // Determine which sub-filter is currently active for this category
      let activeSubFilter = "all";
      if (category === "munitions" && munitionsButtons.length > 0) {
        const activeBtn = document.querySelector(".munitions-btn.active");
        if (activeBtn)
          activeSubFilter = activeBtn.getAttribute("data-subfilter");
      } else if (category === "navigation" && navigationButtons.length > 0) {
        const activeBtn = document.querySelector(".navigation-btn.active");
        if (activeBtn)
          activeSubFilter = activeBtn.getAttribute("data-subfilter");
      }

      // Match main category AND sub-category
      const matchesCategory = filterValue === "all" || category === filterValue;
      const matchesSubCategory =
        activeSubFilter === "all" || subCat === activeSubFilter;

      if (matchesCategory && matchesSubCategory) {
        row.classList.remove("hidden");
        anchors.forEach((anchor) => anchor.classList.add("glightbox-active"));
      } else {
        row.classList.add("hidden");
        anchors.forEach((anchor) =>
          anchor.classList.remove("glightbox-active")
        );
      }
    });
    // 💡 FIX 1: Add reload here so GLightbox rebuilds controls for active items!
    if (typeof lightbox !== "undefined") {
      lightbox.reload();
    }
  }

  const initialActiveButton = document.querySelector(".filter-btn.active");
  if (initialActiveButton) {
    const initialFilter = initialActiveButton.getAttribute("data-filter");
    applyFilter(initialFilter);
  } else {
    // No button is active on load -> Show the landing state!
    applyFilter("none");
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      const filterValue = button.getAttribute("data-filter");
      applyFilter(filterValue);

      if (mainContainer) {
        mainContainer.scrollTo({ top: 0 });
      }
    });
  });

  // Helper Function to handle descriptions containing commas safely
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
        result[image] = {
          source_text: source_text,
          link: link,
        };
      }
    }
    return result;
  }

  // --- SKETCHFAB INITIALIZATION ---
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
          //  CAMERA COORDINATE LOGGER FOR DEV
          apiRef.addEventListener("camerastop", () => {
            apiRef.getCameraLookAt((err, camera) => {
              if (err) return;

              const pos = camera.position.map((n) => Number(n.toFixed(2)));
              const target = camera.target.map((n) => Number(n.toFixed(2)));

              console.log(`📸 Camera Coordinates:`);
              console.log(`Position: [${pos.join(", ")}]`);
              console.log(`Target:   [${target.join(", ")}]`);
            });
          });

          // 💡 INSTANTLY hide "Missile" and "Munitions" on load (0% opacity, no flash)
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

api.addEventListener("viewerready", () => {
  console.log("Sketchfab 3D Viewer is ready!");
  apiRef = api;
  // Hides "Missile" & "Munitions" on initial viewer setup
  resetMaterialOpacities();
});

// ___________________________________________
//          MAIN FUNCTION (HELPER)
// ___________________________________________

function highlightComponent(
  materialName,
  cameraPos,
  cameraTarget,
  displayName
) {
  if (!apiRef) {
    console.warn("Sketchfab API is not loaded yet.");
    return;
  }

  // 1. Move the camera
  apiRef.setCameraLookAt(cameraPos, cameraTarget, 2, function () {
    console.log(`Camera moved to ${displayName} view`);
  });

  // 2. Set highlight colors (Unified across all components)
  apiRef.setHighlightOptions({
    outlineWidth: 2,
    outlineColor: [1, 0.1, 0.1],
    outlineDuration: 200,
    highlightColor: [1, 0.1, 0.1],
    highlightDuration: 200,
  });

  // 3. Retrieve and highlight the material
  apiRef.getMaterialList(function (err, materials) {
    if (err) {
      console.error("Error retrieving materials:", err);
      return;
    }

    // Find the material (case-insensitive)
    var targetMaterial = materials.find(
      (m) => m.name.toLowerCase() === materialName.toLowerCase()
    );

    if (targetMaterial) {
      apiRef.highlightMaterial(targetMaterial);
      console.log(`Highlighted: ${targetMaterial.name}`);
    } else {
      console.warn(`Material "${materialName}" not found`);
    }
  });
}

// ___________________________________________
//          INDIVIDUAL WRAPPERS
// ___________________________________________

function highlightAirframe(materialName = "Frame") {
  highlightComponent(materialName, [0, 3, 3], [0, 0, 0], "Frame");
}

function highlightPropulsion(materialName = "propulsion") {
  highlightComponent(
    materialName,
    [-0.86, -3.2, 1.17],
    [0, -2, 0],
    "Propulsion"
  );
}

function highlightNavigation(materialName = "Navigation") {
  highlightComponent(materialName, [1.4, 3, 1.7], [0.2, 0, 0], "Navigation");
}

function highlightCommunication(materialName = "Communications") {
  highlightComponent(
    materialName,
    [-2.04, 2.55, 0.83],
    [0.03, 0.01, -0.21],
    "Communication"
  );
}


// =========================================================
//  OPACITY FUNCTIONS
// =========================================================

// 1. Core fade transition engine
function fadeOpacities(getFinalTargetFactor, duration = 1000) {
  if (!apiRef) return;

  apiRef.getMaterialList(function (err, materials) {
    if (err || !materials) return;

    const steps = 10;
    const intervalTime = duration / steps;
    let stepCount = 0;

    const targets = materials.map((mat) => {
      const matName = mat.name.toLowerCase();
      const currentFactor = mat.channels?.Opacity?.factor ?? 1.0;
      const targetFactor = getFinalTargetFactor(matName);

      return {
        material: mat,
        start: currentFactor,
        target: targetFactor,
        needsUpdate: Math.abs(currentFactor - targetFactor) > 0.01,
      };
    });

    const activeItems = targets.filter((item) => item.needsUpdate);
    if (activeItems.length === 0) return;

    const timer = setInterval(() => {
      stepCount++;
      const progress = stepCount / steps;

      activeItems.forEach(({ material, start, target }) => {
        if (material.channels && material.channels.Opacity) {
          material.channels.Opacity.enable = true;
          material.channels.Opacity.factor =
            start + (target - start) * progress;

          try {
            apiRef.setMaterial(material);
          } catch (e) {
            console.warn("Material update skipped:", e);
          }
        }
      });

      if (stepCount >= steps) {
        clearInterval(timer);
      }
    }, intervalTime);
  });
}

// 2. RESET FUNCTION
function resetMaterialOpacities() {
  fadeOpacities((matName) => {
    if (matName === "missile" || matName === "munitions") return 0.0;
    return 1.0;
  }, 500);
}

// 3. WARHEAD X-RAY FUNCTION
function focusComponentXRay(
  targetMaterialName = "warheads",
  ghostOpacity = 0.1
) {
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
  }, 1000);
}

// 4. SHOW HIDDEN STORE FUNCTION
function showHiddenComponent(targetMaterialName, cameraPos, cameraTarget) {
  highlightComponent(
    targetMaterialName,
    cameraPos,
    cameraTarget,
    targetMaterialName
  );

  fadeOpacities((matName) => {
    const isTarget = matName === targetMaterialName.toLowerCase();
    if (isTarget) return 1.0;
    if (matName === "missile" || matName === "munitions") return 0.0;
    return 1.0;
  }, 1000);
}
