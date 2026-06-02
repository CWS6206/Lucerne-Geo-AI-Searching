import {useState} from 'react';
import {GEO_CATEGORIES, GEO_SCHEMA} from '../config/geoSchema';
import './LayerFilter.css';

export default function LayerFilter({activeLayers, setActiveLayers}) {
    const [expanded, setExpanded] = useState(false);

    const toggleLayer = (layerId) => {
        if (activeLayers.includes(layerId)) {
            setActiveLayers(activeLayers.filter(id => id !== layerId));
        } else {
            setActiveLayers([...activeLayers, layerId]);
        }
    };

    const toggleCategory = (categoryId, isActive) => {
        const layerIdsInCategory = GEO_SCHEMA.filter(l => l.category === categoryId).map(l => l.id);
        if (isActive) {
            // Entferne alle aus dieser Kategorie
            setActiveLayers(activeLayers.filter(id => !layerIdsInCategory.includes(id)));
        } else {
            // Füge alle aus dieser Kategorie hinzu (die noch nicht drin sind)
            const newActive = [...activeLayers];
            layerIdsInCategory.forEach(id => {
                if (!newActive.includes(id)) newActive.push(id);
            });
            setActiveLayers(newActive);
        }
    };

    return (
        <div className="layer-filter-container">
            <div
                className="layer-filter-header"
                onClick={() => setExpanded(!expanded)}
            >
                <span>Geodaten Filter konfigurieren ({activeLayers.length} aktiv)</span>
                <span>{expanded ? '▲' : '▼'}</span>
            </div>

            {expanded && (
                <div className="layer-filter-content">
                    <p className="filter-description">Wählen Sie, welche Themen vom LLM analysiert werden sollen.</p>

                    {GEO_CATEGORIES.map(category => {
                        const layersInCategory = GEO_SCHEMA.filter(l => l.category === category.id);
                        const activeCount = layersInCategory.filter(l => activeLayers.includes(l.id)).length;
                        const isCategoryActive = activeCount === layersInCategory.length;

                        return (
                            <div key={category.id} className="filter-category">
                                <div className="category-header">
                                    <label className="checkbox-container category-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={isCategoryActive}
                                            onChange={() => toggleCategory(category.id, isCategoryActive)}
                                        />
                                        <span className="checkmark"></span>
                                        <strong>{category.title}</strong>
                                    </label>
                                    <span className="count-badge">{activeCount}/{layersInCategory.length}</span>
                                </div>

                                <div className="category-layers">
                                    {layersInCategory.map(layer => (
                                        <label key={layer.id} className="checkbox-container layer-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={activeLayers.includes(layer.id)}
                                                onChange={() => toggleLayer(layer.id)}
                                            />
                                            <span className="checkmark"></span>
                                            {layer.title}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
