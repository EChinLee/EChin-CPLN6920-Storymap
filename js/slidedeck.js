/**
 * A slide deck object
 */
 class SlideDeck {
  /**
   * Constructor for the SlideDeck object.
   * @param {NodeList} slides A list of HTML elements containing the slide text.
   * @param {L.map} map The Leaflet map where data will be shown.
   */
  constructor(slides, map) {
    this.slides = slides;
    this.map = map;

    this.dataLayer = L.layerGroup().addTo(map);
    this.currentSlideIndex = 0;
  }

  /**
   * ### updateDataLayer
   *
   * The updateDataLayer function will clear any markers or shapes previously
   * added to the GeoJSON layer on the map, and replace them with the data
   * provided in the `data` argument. The `data` should contain a GeoJSON
   * FeatureCollection object.
   *
   * @param {object} data A GeoJSON FeatureCollection object
   * @return {L.GeoJSONLayer} The new GeoJSON layer that has been added to the
   *                          data layer group.
   */
  updateDataLayer(data) {
    this.dataLayer.clearLayers();
    const geoJsonLayer = L.geoJSON(data, {
      pointToLayer: (feature, latlng) => {
        const iconUrl = feature.properties.note === '鳥居'
          ? 'pic/birdnest.svg'
          : 'pic/shrine.svg';

        const iconSize = feature.properties.note === '鳥居' ? [20, 20] : [30, 30];

        const markerIcon = L.icon({
          iconUrl: iconUrl,
          iconSize: iconSize,
          iconAnchor: [iconSize[0] / 2, iconSize[1] / 2],
        });
        return L.marker(latlng, { icon: markerIcon });
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties && feature.properties.name) {
          layer.bindTooltip(feature.properties.name, {
            permanent: false,
            direction: 'top',
            opacity: 0.8,
          });
        }
      },
      style: () => ({
        color: '#843636',
        fillColor: 'rgba(132, 54, 54, 0.5)',
        fillOpacity: 0.5,
        weight: 2,
      }),
    }).addTo(this.dataLayer);

    return geoJsonLayer;
  }

  /**
   * ### getSlideFeatureCollection
   *
   * Load the slide's features from a GeoJSON file.
   *
   * @param {HTMLElement} slide The slide's HTML element. The element id should match the key for the slide's GeoJSON file
   * @return {object} The FeatureCollection as loaded from the data file
   */
  async getSlideFeatureCollection(slide) {
    const resp = await fetch(`data/${slide.id}.geojson`);
    const data = await resp.json();
    return data;
  }

  hideAllSlides() {
    for (const slide of this.slides) {
      slide.classList.add('hidden');
    }
  }

  async syncMapToSlide(slide) {
    const collection = await this.getSlideFeatureCollection(slide);
    const layer = this.updateDataLayer(collection);

    const boundsFromBbox = (bbox) => {
      const [west, south, east, north] = bbox;
      return L.latLngBounds(
        L.latLng(south, west),
        L.latLng(north, east)
      );
    };

    const handleFlyEnd = () => {
      if (slide.showpopups) {
        layer.eachLayer((l) => {
          l.bindTooltip(l.feature.properties.label, { permanent: true });
          l.openTooltip();
        });
      }
      this.map.removeEventListener('moveend', handleFlyEnd);
    };

    this.map.addEventListener('moveend', handleFlyEnd);
    if (collection.bbox) {
      this.map.flyToBounds(boundsFromBbox(collection.bbox));
    } else {
      this.map.flyToBounds(layer.getBounds());
    }
  }

  syncMapToCurrentSlide() {
    const slide = this.slides[this.currentSlideIndex];
    this.syncMapToSlide(slide);
  }

  goNextSlide() {
    this.currentSlideIndex++;
    if (this.currentSlideIndex === this.slides.length) {
      this.currentSlideIndex = 0;
    }
    this.syncMapToCurrentSlide();
  }

  goPrevSlide() {
    this.currentSlideIndex--;
    if (this.currentSlideIndex < 0) {
      this.currentSlideIndex = this.slides.length - 1;
    }
    this.syncMapToCurrentSlide();
  }

  preloadFeatureCollections() {
    for (const slide of this.slides) {
      this.getSlideFeatureCollection(slide);
    }
  }

  calcCurrentSlideIndex() {
    const scrollPos = window.scrollY;
    const windowHeight = window.innerHeight;

    let i;
    for (i = 0; i < this.slides.length; i++) {
      const slidePos = this.slides[i].offsetTop - scrollPos + windowHeight * 0.7;
      if (slidePos >= 0) {
        break;
      }
    }

    if (i !== this.currentSlideIndex) {
      this.currentSlideIndex = i;
      this.syncMapToCurrentSlide();
    }
  }
}

export { SlideDeck };
