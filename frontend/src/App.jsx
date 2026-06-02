import {useState} from 'react';
import axios from 'axios';
import MapComponent from './components/MapComponent';
import ResultPanel from './components/ResultPanel';
import LayerFilter from './components/LayerFilter';
import {GEO_SCHEMA} from './config/geoSchema';
import './index.css';

function App() {
    const [openaiKey, setOpenaiKey] = useState(() => sessionStorage.getItem('openai_api_key') || '');
    const [geminiKey, setGeminiKey] = useState(() => sessionStorage.getItem('gemini_api_key') || '');
    const [markerPosition, setMarkerPosition] = useState(null);
    const [markerPosition2, setMarkerPosition2] = useState(null);
    const [activeMarker, setActiveMarker] = useState(1); // 1 = A, 2 = B
    const [compareMode, setCompareMode] = useState(false);
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(true); // Toggle für Einstellungen
    const [radius, setRadius] = useState(200);
    const [role, setRole] = useState('private');
    const [provider, setProvider] = useState(() => sessionStorage.getItem('ai_provider') || 'gemini'); // 'openai' oder 'gemini'

    // Initialisiere activeLayers basierend auf defaultActive im Schema
    const [activeLayers, setActiveLayers] = useState(() => {
        return GEO_SCHEMA.filter(layer => layer.defaultActive !== false).map(layer => layer.id);
    });
    const [highlightFeature, setHighlightFeature] = useState(null); // Geometrie-Highlight für Klicks in Rohdaten

    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [error, setError] = useState(null);
    const [rawGeoData, setRawGeoData] = useState(null);
    const [rawGeoData2, setRawGeoData2] = useState(null);
    const [egrid, setEgrid] = useState(null);
    const [parcelGeometry, setParcelGeometry] = useState(null);

    const handleOpenaiKeyChange = (e) => {
        const val = e.target.value;
        setOpenaiKey(val);
        sessionStorage.setItem('openai_api_key', val);
    };

    const handleGeminiKeyChange = (e) => {
        const val = e.target.value;
        setGeminiKey(val);
        sessionStorage.setItem('gemini_api_key', val);
    };

    const handleProviderChange = (e) => {
        const val = e.target.value;
        setProvider(val);
        sessionStorage.setItem('ai_provider', val);

        // API-Keys leeren beim Wechsel
        setOpenaiKey('');
        setGeminiKey('');
        sessionStorage.removeItem('openai_api_key');
        sessionStorage.removeItem('gemini_api_key');
    };

    const handleAnalyze = async () => {
        const activeKey = provider === 'gemini' ? geminiKey : openaiKey;
        if (!activeKey || !activeKey.trim()) {
            setError(`Bitte gib einen gültigen ${provider === 'gemini' ? 'Gemini' : 'OpenAI'} API-Key ein.`);
            return;
        }
        if (!markerPosition) {
            setError("Bitte wähle zuerst einen Punkt (A) auf der Karte.");
            return;
        }
        if (compareMode && !markerPosition2) {
            setError("Bitte wähle auch den zweiten Punkt (B) auf der Karte für den Vergleich.");
            return;
        }
        if (activeLayers.length === 0) {
            setError("Bitte wähle mindestens einen Geodaten-Layer aus.");
            return;
        }

        setLoading(true);
        setError(null);
        setReport(null);
        setRawGeoData(null);
        setRawGeoData2(null);
        setEgrid(null);
        setParcelGeometry(null);

        try {
            if (compareMode) {
                const response = await axios.post(
                    'http://localhost:8000/api/compare',
                    {
                        lat1: markerPosition.lat,
                        lng1: markerPosition.lng,
                        lat2: markerPosition2.lat,
                        lng2: markerPosition2.lng,
                        radius: radius,
                        role: role,
                        provider: provider,
                        active_layers: activeLayers
                    },
                    {headers: {'Authorization': `Bearer ${activeKey.trim()}`, 'Content-Type': 'application/json'}}
                );
                setReport(response.data.report);
                setRawGeoData(response.data.raw_geo_data_1);
                setRawGeoData2(response.data.raw_geo_data_2);
            } else {
                const response = await axios.post(
                    'http://localhost:8000/api/analyze',
                    {
                        lat: markerPosition.lat,
                        lng: markerPosition.lng,
                        radius: radius,
                        role: role,
                        provider: provider,
                        active_layers: activeLayers
                    },
                    {headers: {'Authorization': `Bearer ${activeKey.trim()}`, 'Content-Type': 'application/json'}}
                );
                setReport(response.data.report);
                setRawGeoData(response.data.raw_geo_data);
                setEgrid(response.data.egrid);
                setParcelGeometry(response.data.parcel_geometry);
            }
        } catch (err) {
            setError(err.response?.data?.detail || err.message || "Ein Fehler ist aufgetreten.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container" style={{paddingTop: '20px'}}>
            <header style={{
                padding: '0 20px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: '16px',
                flexWrap: 'wrap'
            }}>
                <h1 style={{margin: 0, fontSize: '1.35rem', color: '#1a202c'}}>Lucerne Geo-AI Searching Tool</h1>
                <span style={{fontSize: '0.85rem', color: '#4a5568'}}>Copyright by Dr. René Bäder (PhDs)</span>
            </header>
            <main className="main-content">
                <div className="left-panel">
                    <div className="map-wrapper" style={{position: 'relative'}}>
                        <MapComponent
                            markerPosition={markerPosition}
                            markerPosition2={markerPosition2}
                            setMarkerPosition={activeMarker === 1 ? setMarkerPosition : setMarkerPosition2}
                            radius={radius}
                            parcelGeometry={parcelGeometry}
                            highlightFeature={highlightFeature}
                        />
                        {compareMode && (
                            <div style={{
                                position: 'absolute',
                                bottom: '15px',
                                left: '410px',
                                zIndex: 1000,
                                display: 'flex',
                                gap: '10px',
                                backgroundColor: 'rgba(255,255,255,0.92)',
                                backdropFilter: 'blur(10px)',
                                padding: '10px',
                                borderRadius: '8px',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                            }}>
                                <button
                                    onClick={() => setActiveMarker(1)}
                                    style={{
                                        backgroundColor: activeMarker === 1 ? '#3182ce' : '#e2e8f0',
                                        color: activeMarker === 1 ? 'white' : '#4a5568',
                                        border: 'none',
                                        padding: '8px 15px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    📍 Punkt A
                                </button>
                                <button
                                    onClick={() => setActiveMarker(2)}
                                    style={{
                                        backgroundColor: activeMarker === 2 ? '#e53e3e' : '#e2e8f0',
                                        color: activeMarker === 2 ? 'white' : '#4a5568',
                                        border: 'none',
                                        padding: '8px 15px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    📍 Punkt B
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="map-controls">
                        <div className="control-row" style={{
                            display: 'flex',
                            borderBottom: '1px solid #e2e8f0',
                            paddingBottom: '15px',
                            marginBottom: '15px'
                        }}>
                            <div style={{flex: 1, display: 'flex', gap: '10px'}}>
                                <button
                                    onClick={() => {
                                        setCompareMode(false);
                                        setActiveMarker(1);
                                        setMarkerPosition2(null);
                                        setRawGeoData2(null);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        backgroundColor: !compareMode ? '#2b6cb0' : '#edf2f7',
                                        color: !compareMode ? 'white' : '#4a5568',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Einzelanalyse
                                </button>
                                <button
                                    onClick={() => setCompareMode(true)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        backgroundColor: compareMode ? '#2b6cb0' : '#edf2f7',
                                        color: compareMode ? 'white' : '#4a5568',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    1 vs 1 Vergleich
                                </button>
                            </div>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                backgroundColor: '#edf2f7',
                                padding: '10px',
                                borderRadius: '4px'
                            }}
                            onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                        >
                            <span style={{
                                fontWeight: 'bold',
                                color: '#2d3748'
                            }}>Einstellungen & Layer ({activeLayers.length} aktiv)</span>
                            <span>{isSettingsExpanded ? '▲ Einklappen' : '▼ Ausklappen'}</span>
                        </div>

                        {isSettingsExpanded && (
                            <>
                                <div className="control-row"
                                     style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <label style={{margin: 0, minWidth: '80px'}}>AI Provider:</label>
                                        <select value={provider} onChange={handleProviderChange}
                                                style={{width: '130px', margin: 0}}>
                                            <option value="gemini">Google Gemini</option>
                                            <option value="openai">OpenAI</option>
                                        </select>
                                    </div>

                                    <div style={{flex: 1}}>
                                        {provider === 'openai' ? (
                                            <input
                                                type="password"
                                                placeholder="OpenAI API-Key (sk-...)"
                                                value={openaiKey}
                                                onChange={handleOpenaiKeyChange}
                                                style={{
                                                    width: '100%',
                                                    padding: '7px 10px',
                                                    border: '1px solid #cbd5e0',
                                                    borderRadius: '4px',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        ) : (
                                            <input
                                                type="password"
                                                placeholder="Gemini API-Key"
                                                value={geminiKey}
                                                onChange={handleGeminiKeyChange}
                                                style={{
                                                    width: '100%',
                                                    padding: '7px 10px',
                                                    border: '1px solid #cbd5e0',
                                                    borderRadius: '4px',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="control-row" style={{marginTop: '-10px', marginBottom: '10px'}}>
                                    <small style={{color: '#718096'}}>
                                        Verwendetes
                                        Modell: <strong>{provider === 'openai' ? 'gpt-3.5-turbo (Fast)' : 'gemini-3.1-flash-lite'}</strong>
                                    </small>
                                </div>
                                <div className="control-row">
                                    <label>Zielgruppe:</label>
                                    <select value={role} onChange={(e) => setRole(e.target.value)}>
                                        <option value="private">Privatperson / Familie</option>
                                        <option value="business">Baufirma / Entwickler</option>
                                    </select>
                                </div>
                                <div className="control-row">
                                    <label>Suchradius:</label>
                                    <input
                                        type="range"
                                        min="50"
                                        max="1000"
                                        step="50"
                                        value={radius}
                                        onChange={(e) => setRadius(parseInt(e.target.value))}
                                    />
                                    <span>{radius} m</span>
                                </div>

                                <LayerFilter
                                    activeLayers={activeLayers}
                                    setActiveLayers={setActiveLayers}
                                />
                            </>
                        )}

                        <button
                            className="analyze-button"
                            onClick={handleAnalyze}
                            disabled={loading || !markerPosition || (provider === 'openai' ? !openaiKey : !geminiKey) || activeLayers.length === 0}
                        >
                            {loading ? "Analysiere..." : "Standort analysieren"}
                        </button>
                    </div>
                </div>

                <div className="right-panel">
                    <ResultPanel
                        loading={loading}
                        report={report}
                        error={error}
                        rawGeoData={rawGeoData}
                        rawGeoData2={rawGeoData2}
                        compareMode={compareMode}
                        egrid={egrid}
                        setHighlightFeature={setHighlightFeature}
                    />
                </div>
            </main>
        </div>
    );
}

export default App;
