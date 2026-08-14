let apiRef = null;

document.addEventListener("DOMContentLoaded", async () => {
  // =========================================================
  // 1. HELPERS & PARSERS
  // =========================================================
  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length === 0) return [];

    const parseRow = (line) => {
      const columns = [];
      let currentColumn = "";
      let insideQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
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
      return columns;
    };

    const headers = parseRow(lines[0]);
    return lines.slice(1).map((line) => {
      const values = parseRow(line);
      const rowObj = {};
      headers.forEach((header, index) => {
        rowObj[header] = values[index] || "";
      });
      return rowObj;
    });
  }

  // =========================================================
  // 2. DATA FETCHING & DYNAMIC DOM GENERATION
  // =========================================================
  try {
    const [sourcesRes, timelineRes] = await Promise.all([
      fetch("drone-sources.csv"),
      fetch("timeline-data.csv"),
    ]);

    const sourcesData = parseCSV(await sourcesRes.text());
    const timelineItems = parseCSV(await timelineRes.text());

    console.log("Loaded sources:", sourcesData.length);
    console.log("Loaded timeline entries:", timelineItems.length);

    // Build Attributions Lookup Map
    const sourcesMap = {};
    sourcesData.forEach((item) => {
      if (item.image) {
        sourcesMap[item.image] = {
          source_text: item.source_text || "",
          link: item.link || "",
        };
      }
    });

    const galleryRowsContainer = document.getElementById("dynamic-gallery-rows");
    if (!galleryRowsContainer) {
      console.error("Target container #dynamic-gallery-rows not found in HTML!");
      return;
    }
    galleryRowsContainer.innerHTML = ""; // Clear existing fallback contents

    // Build Gallery Rows
    timelineItems.forEach((item) => {
      const row = document.createElement("div");
      row.className = "gallery-row hidden";
      row.setAttribute("data-category", item.category);
      if (item.subCategory) {
        row.setAttribute("data-subCategory", item.subCategory);
      }

      // Left Column: Date & Description
      const timelineCol = document.createElement("div");
      timelineCol.className = "timeline-column";

      if (item.year) {
        const yearDiv = document.createElement("div");
        yearDiv.className = "timeline-year";
        yearDiv.textContent = item.year;
        timelineCol.appendChild(yearDiv);
      }

      const descDiv = document.createElement("div");
      descDiv.className = "timeline-description";
      descDiv.textContent = item.description;
      timelineCol.appendChild(descDiv);

      // Right Column: Images & Captions
      const galleryCol = document.createElement("div");
      galleryCol.className = "gallery-column";

      const imagePaths = item.images ? item.images.split("|") : [];
      imagePaths.forEach((imgPath) => {
        const trimmedPath = imgPath.trim();
        if (!trimmedPath) return;

        const sourceMatch = sourcesMap[trimmedPath];

        const anchor = document.createElement("a");
        anchor.setAttribute("href", trimmedPath);
        anchor.className = "glightbox";

        const img = document.createElement("img");
        img.src = trimmedPath;

        if (sourceMatch) {
          img.alt = sourceMatch.source_text;
          anchor.setAttribute("data-description", sourceMatch.source_text);
        }

        anchor.appendChild(img);
        galleryCol.appendChild(anchor);

        // Caption Link
        const figcaption = document.createElement("figcaption");
        figcaption.className = "dynamic-caption";
        if (sourceMatch && sourceMatch.link) {
          figcaption.innerHTML = `<a href="${sourceMatch.link}" target="_blank" rel="noopener noreferrer">${sourceMatch.source_text}</a>`;
        }
        galleryCol.appendChild(figcaption);
      });

      row.appendChild(timelineCol);
      row.appendChild(galleryCol);
      galleryRowsContainer.appendChild(row);
    });

    console.log("Gallery rows successfully rendered into the DOM!");

    // =========================================================
    // 3. LIGHTBOX & DOM ELEMENTS SELECTION
    // =========================================================
    const lightbox = GLightbox({
      selector: ".glightbox-active",
      loop: true,
      openEffect: "zoom",
      closeEffect: "zoom",
    });

    const filterButtons = document.querySelectorAll(".filter-btn");
    const galleryRows = document.querySelectorAll(".gallery-row");
    const mainContainer = document.querySelector(".timeline-container");
    const landingEl = document.querySelector(".landing");

    const navigationButtons = document.querySelectorAll(".navigation-btn");
    const navigationFilter = document.querySelector(".navigation-filter");

    const munitionsButtons = document.querySelectorAll(".munitions-btn");
    const munitionsFilter = document.querySelector(".munitions-filter");

    // =========================================================
    // 4. MAIN FILTER CONTROLLER
    // =========================================================
    function applyFilter(filterValue) {
      if (!filterValue || filterValue === "none") {
        if (landingEl) landingEl.style.display = "block";
        if (munitionsFilter) munitionsFilter.style.display = "none";
        if (navigationFilter) navigationFilter.style.display = "none";
        galleryRows.forEach((row) => row.classList.add("hidden"));
        if (typeof lightbox !== "undefined") lightbox.reload();
        return;
      }

      if (landingEl) landingEl.style.display = "none";

      // Configure Sub-Bar Display & Default Active States
      if (filterValue === "munitions") {
        if (munitionsFilter) munitionsFilter.style.display = "flex";
        if (navigationFilter) navigationFilter.style.display = "none";
        munitionsButtons.forEach((btn) => {
          btn.classList.toggle("active", btn.getAttribute("data-subfilter") === "mun-1");
        });
      } else if (filterValue === "navigation") {
        if (navigationFilter) navigationFilter.style.display = "flex";
        if (munitionsFilter) munitionsFilter.style.display = "none";
        navigationButtons.forEach((btn) => {
          btn.classList.toggle("active", btn.getAttribute("data-subfilter") === "nav-1");
        });
      } else {
        if (munitionsFilter) munitionsFilter.style.display = "none";
        if (navigationFilter) navigationFilter.style.display = "none";
        resetMaterialOpacities();
      }

      // Filter DOM Rows
      galleryRows.forEach((row) => {
        const category = row.getAttribute("data-category");
        const subCat = row.getAttribute("data-subCategory");
        const anchors = row.querySelectorAll(".glightbox");

        let activeSubFilter = null;
        if (filterValue === "munitions") activeSubFilter = "mun-1";
        if (filterValue === "navigation") activeSubFilter = "nav-1";

        const matchesCategory = category === filterValue;
        const matchesSubCategory = !activeSubFilter || !subCat || subCat === activeSubFilter;

        if (matchesCategory && matchesSubCategory) {
          row.classList.remove("hidden");
          anchors.forEach((a) => a.classList.add("glightbox-active"));
        } else {
          row.classList.add("hidden");
          anchors.forEach((a) => a.classList.remove("glightbox-active"));
        }
      });

      if (typeof lightbox !== "undefined") {
        lightbox.reload();
      }
    }

    // =========================================================
    // 5. EVENT LISTENERS
    // =========================================================

    // Main Category Filter Buttons
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        button.blur();
        filterButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        const filterVal = button.getAttribute("data-filter");
        applyFilter(filterVal);

        // Trigger 3D Views
        if (filterVal === "airframe") highlightAirframe();
        else if (filterVal === "propulsion") highlightPropulsion();
        else if (filterVal === "navigation") highlightNavigation();
        else if (filterVal === "communication") highlightCommunication();
        else if (filterVal === "munitions") focusComponentXRay("warheads", 0.1);

        if (mainContainer) mainContainer.scrollTo({ top: 0 });
      });
    });

    // Navigation Sub-filter Buttons
    navigationButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        button.blur();

        navigationButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        const subFilter = button.getAttribute("data-subfilter");
        const navRows = document.querySelectorAll('.gallery-row[data-category="navigation"]');

        navRows.forEach((row) => {
          const subCat = row.getAttribute("data-subCategory");
          const matches = !subCat || subCat === subFilter;
          row.classList.toggle("hidden", !matches);
          row.querySelectorAll(".glightbox").forEach((a) => {
            a.classList.toggle("glightbox-active", matches);
          });
        });

        if (typeof lightbox !== "undefined") lightbox.reload();

        // 3D View Triggers
        resetMaterialOpacities();
        if (subFilter === "nav-1") highlightNavigation();
        else if (subFilter === "nav-2") highlightSatNav();
      });
    });

    // Munitions Sub-filter Buttons
    munitionsButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        button.blur();

        munitionsButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        const subFilter = button.getAttribute("data-subfilter");
        const munRows = document.querySelectorAll('.gallery-row[data-category="munitions"]');

        munRows.forEach((row) => {
          const subCat = row.getAttribute("data-subCategory");
          const matches = !subCat || subCat === subFilter;
          row.classList.toggle("hidden", !matches);
          row.querySelectorAll(".glightbox").forEach((a) => {
            a.classList.toggle("glightbox-active", matches);
          });
        });

        if (typeof lightbox !== "undefined") lightbox.reload();

        // 3D View Triggers
        if (subFilter === "mun-1") {
          focusComponentXRay("warheads", 0.1);
        } else if (subFilter === "mun-2") {
          showHiddenComponent("Missile", [-1.44, 2.15, 0.69], [0.25, -0.05, -0.03]);
        } else if (subFilter === "mun-3") {
          showHiddenComponent("Munitions", [1.8, 0.7, -0.8], [-0.2, -0.75, 0]);
        }
      });
    });

  } catch (err) {
    console.error("Error fetching or processing CSV files:", err);
  }

  // =========================================================
  // 6. SKETCHFAB INITIALIZATION
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

          // Camera Logger
          apiRef.addEventListener("camerastop", () => {
            apiRef.getCameraLookAt((err, camera) => {
              if (err || !camera) return;
              const pos = camera.position.map((n) => Number(n.toFixed(2)));
              const target = camera.target.map((n) => Number(n.toFixed(2)));
              console.log(`📸 Camera Position: [${pos.join(", ")}]`);
              console.log(`📸 Camera Target:   [${target.join(", ")}]`);
            });
          });

          // Default Hidden Elements
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
// 7. CORE SKETCHFAB HIGHLIGHT & CAMERA WRAPPERS
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
      (m) => m.name.trim().toLowerCase() === materialName.trim().toLowerCase()
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
  highlightComponent(materialName, [-0.37, -3.08, 0.88], [-0.01, -1.86, 0.02], "Propulsion");
}

function highlightNavigation(materialName = "Navigation") {
  highlightComponent(materialName, [-0.97, 1.37, 1.44], [0.49, -0.02, -0.24], "Flight Control");
}

function highlightSatNav(materialName = "SatNav") {
  highlightComponent(materialName, [0.6, 0.07, 0.61], [0.47, -0.38, 0.15], "Satellite Navigation");
}

function highlightCommunication(materialName = "Communications") {
  highlightComponent(materialName, [2.12, -2.6, 0.38], [-0.4, -0.63, -0.62], "Communication");
}

// =========================================================
// 8. OPACITY TRANSITION HELPERS
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