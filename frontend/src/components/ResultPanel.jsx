import { useState, useEffect } from 'react';
import axios from 'axios';
import { GEO_SCHEMA } from '../config/geoSchema';

// Wir nutzen einen simplen Regex-Parser für Markdown, um das MVP simpel zu halten 
function renderMarkdown(text) {
    if (!text) return null;

    let html = text
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^[-*]\s+(.*$)/gim, '<li>$1</li>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>');

    html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');

    html = html.split('\n').map(line => {
        if (line.trim() !== '' && !line.startsWith('<')) {
            return `<p>${line}</p>`;
        }
        return line;
    }).join('\n');

    return { __html: html };
}

export default function ResultPanel({
    loading,
    report,
    error,
    rawGeoData,
    rawGeoData2,
    compareMode,
    egrid,
    setHighlightFeature
}) {
    const [viewMode, setViewMode] = useState('ai'); // 'ai' oder 'raw'
    const [activeRawView, setActiveRawView] = useState(1); // 1 = Standort A, 2 = Standort B
    const [progress, setProgress] = useState(0);
    const [isLoadingPdf, setIsLoadingPdf] = useState(false);

    useEffect(() => {
        if (loading) {
            const resetTimer = setTimeout(() => setProgress(0), 0);
            const timer = setInterval(() => {
                setProgress(oldProgress => {
                    // Startet schnell, wird dann extrem langsam (für lange Server-Requests)
                    const diff = 98 - oldProgress;
                    const step = Math.max(0.1, diff * 0.04);
                    return oldProgress < 98 ? oldProgress + step : 98;
                });
            }, 800);
            return () => {
                clearTimeout(resetTimer);
                clearInterval(timer);
            };
        }
    }, [loading]);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner" style={{ marginBottom: '15px' }}></div>
                <p style={{ fontWeight: '600', marginBottom: '15px' }}>Analysiere Geodaten und generiere Bericht...</p>

                <div style={{ width: '80%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                    <div style={{
                        height: '100%',
                        width: `${progress}%`,
                        backgroundColor: '#3182ce',
                        transition: 'width 0.5s ease-out',
                        borderRadius: '4px'
                    }}></div>
                </div>

                <p style={{ fontSize: '0.8rem', color: '#a0aec0', margin: 0 }}>
                    WFS-Layer & ÖREB werden abgefragt... ({Math.round(progress)}%)
                </p>
                <p style={{ fontSize: '0.75rem', marginTop: '5px', color: '#cbd5e0' }}>
                    Dies kann einige Sekunden dauern.
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-message">
                <strong>Fehler:</strong> {error}
            </div>
        );
    }

    if (!report && !rawGeoData) {
        return (
            <div className="empty-state">
                Wähle einen Punkt auf der Karte und klicke auf "Standort analysieren", um den Bericht zu generieren.
            </div>
        );
    }

    const handlePdfClick = async (e) => {
        e.preventDefault();
        setIsLoadingPdf(true);

        // Sofort einen neuen Tab öffnen (verhindert Popup-Blocker durch asynchronen Aufruf)
        const pdfWindow = window.open('', '_blank');
        if (pdfWindow) {
            pdfWindow.document.write(`
                <html>
                    <head>
                        <title>ÖREB Auszug lädt...</title>
                        <style>
                            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f7fafc; color: #2d3748; }
                            .loader { border: 4px solid #e2e8f0; border-top: 4px solid #3182ce; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
                            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                        </style>
                    </head>
                    <body>
                        <div class="loader"></div>
                        <h2>Lade offiziellen ÖREB-Auszug...</h2>
                        <p>Das Dokument wird vom kantonalen Server generiert (Dauer: ca. 5-15 Sekunden).</p>
                    </body>
                </html>
            `);
        }

        try {
            const response = await axios.get(`http://localhost:8000/api/oereb/pdf/${egrid}`, {
                responseType: 'blob'
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const objectUrl = URL.createObjectURL(blob);

            if (pdfWindow) {
                pdfWindow.location.href = objectUrl;
            } else {
                // Fallback, falls der Popup-Blocker hart eingreift
                window.open(objectUrl, '_blank');
            }
        } catch (err) {
            console.error("Fehler beim Laden des PDFs", err);
            if (pdfWindow) {
                pdfWindow.document.body.innerHTML = '<h2 style="color: red; text-align: center; margin-top: 20%">Fehler beim Laden des PDFs.</h2><p style="text-align: center;">Der kantonale Server antwortet nicht rechtzeitig.</p>';
            } else {
                alert("Fehler beim Laden des PDFs.");
            }
        } finally {
            setIsLoadingPdf(false);
        }
    };

    const renderOerebBanner = () => {
        if (!egrid) return null;
        return (
            <div style={{
                backgroundColor: '#ebf8ff',
                border: '1px solid #90cdf4',
                borderLeft: '4px solid #3182ce',
                padding: '12px 15px',
                marginBottom: '20px',
                borderRadius: '4px',
                color: '#2c5282',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
            }}>
                <div>
                    <strong style={{ display: 'block', marginBottom: '2px' }}>Grundstück gefunden!</strong>
                    <span style={{ fontSize: '0.9rem' }}>Verbindlicher ÖREB-Auszug für Parzelle <strong>{egrid}</strong> wurde geladen.</span>
                </div>
                <button
                    onClick={handlePdfClick}
                    disabled={isLoadingPdf}
                    style={{
                        backgroundColor: isLoadingPdf ? '#a0aec0' : '#3182ce',
                        color: 'white',
                        padding: '6px 12px',
                        border: 'none',
                        cursor: isLoadingPdf ? 'not-allowed' : 'pointer',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    {isLoadingPdf ? 'Lade PDF...' : 'PDF ansehen'}
                    {isLoadingPdf && (
                        <div style={{
                            width: '12px', height: '12px',
                            border: '2px solid white', borderTop: '2px solid transparent',
                            borderRadius: '50%', animation: 'spin 1s linear infinite'
                        }}></div>
                    )}
                </button>
            </div>
        );
    };

    const renderRawDataForm = () => {
        const currentRawData = activeRawView === 1 ? rawGeoData : rawGeoData2;
        if (!currentRawData) return <p>Keine Rohdaten für diesen Standort verfügbar.</p>;

        return (
            <div className="raw-data-form">
                <h2 style={{ marginTop: 0, marginBottom: '10px' }}>Geodaten Rohdaten (Übersicht)</h2>

                {renderOerebBanner()}

                <div style={{
                    backgroundColor: '#e6fffa',
                    borderLeft: '4px solid #319795',
                    padding: '10px 15px',
                    marginBottom: '20px',
                    fontSize: '0.9rem',
                    color: '#285e61'
                }}>
                    <p style={{ margin: 0 }}>
                        <strong>Was sehen Sie hier?</strong><br />
                        Da Sie auf der Karte einen <strong>Radius</strong> (z.B. 200m) ausgewählt haben, durchsucht die
                        Schnittstelle dieses gesamte Gebiet. Das bedeutet, dass nicht nur das genaue Zentrum,
                        sondern <strong>alle benachbarten Grundstücke, Zonen und Strassen</strong> erfasst werden, die
                        sich mit dem Kreis überschneiden.<br />
                        Eine Liste von 10 Bauzonen bedeutet also, dass im Umkreis 10 verschiedene Parzellen oder
                        Zonentypen liegen (z.B. Wohnzone, angrenzender Wald, Strasse).
                    </p>
                </div>

                {compareMode && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <button
                            onClick={() => setActiveRawView(1)}
                            style={{
                                flex: 1,
                                padding: '8px',
                                backgroundColor: activeRawView === 1 ? '#3182ce' : '#edf2f7',
                                color: activeRawView === 1 ? 'white' : '#4a5568',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Standort A
                        </button>
                        <button
                            onClick={() => setActiveRawView(2)}
                            style={{
                                flex: 1,
                                padding: '8px',
                                backgroundColor: activeRawView === 2 ? '#e53e3e' : '#edf2f7',
                                color: activeRawView === 2 ? 'white' : '#4a5568',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Standort B
                        </button>
                    </div>
                )}

                {GEO_SCHEMA.map((schema, index) => {
                    const rawFeatures = currentRawData[schema.layer] || [];

                    // Nach Distanz sortieren (aufsteigend)
                    const features = [...rawFeatures].sort((a, b) => {
                        const distA = a.Distanz_zum_Standort_m !== undefined ? a.Distanz_zum_Standort_m : Infinity;
                        const distB = b.Distanz_zum_Standort_m !== undefined ? b.Distanz_zum_Standort_m : Infinity;
                        return distA - distB;
                    });

                    const hasData = features.length > 0;

                    // Eigener State pro Layer für "Mehr anzeigen" - Da Map in React keine Hooks im Loop erlaubt,
                    // verwenden wir eine simple interne Component
                    return (
                        <LayerSection key={index} schema={schema} features={features} hasData={hasData}
                            setHighlightFeature={setHighlightFeature} />
                    );
                })}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {viewMode === 'ai' && renderOerebBanner()}

            <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '15px'
            }}>
                <button
                    onClick={() => setViewMode('ai')}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: viewMode === 'ai' ? '#3182ce' : '#e2e8f0',
                        color: viewMode === 'ai' ? '#fff' : '#4a5568',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: viewMode === 'ai' ? 'bold' : 'normal'
                    }}
                >
                    KI Bericht
                </button>
                <button
                    onClick={() => setViewMode('raw')}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: viewMode === 'raw' ? '#3182ce' : '#e2e8f0',
                        color: viewMode === 'raw' ? '#fff' : '#4a5568',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: viewMode === 'raw' ? 'bold' : 'normal'
                    }}
                >
                    Rohdaten (Geo API)
                </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
                {viewMode === 'ai' && report && (
                    <div
                        className="markdown-body"
                        dangerouslySetInnerHTML={renderMarkdown(report)}
                    />
                )}
                {viewMode === 'raw' && renderRawDataForm()}
            </div>
        </div>
    );
}

// Hilfskomponente für das Rendern eines einzelnen Layers mit "Mehr anzeigen" Logik
function LayerSection({ schema, features, hasData, setHighlightFeature }) {
    const [expanded, setExpanded] = useState(false);
    const displayLimit = 3;
    const visibleFeatures = expanded ? features : features.slice(0, displayLimit);
    const hiddenCount = features.length - displayLimit;

    return (
        <div style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
        }}>
            <h3 style={{
                marginTop: 0,
                color: '#2b6cb0',
                fontSize: '1.1rem',
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                {schema.title}
                {hasData && <span style={{
                    fontSize: '0.8rem',
                    backgroundColor: '#e2e8f0',
                    color: '#4a5568',
                    padding: '2px 8px',
                    borderRadius: '12px'
                }}>{features.length} Treffer</span>}
            </h3>

            {!hasData ? (
                <p style={{ color: '#718096', fontStyle: 'italic', margin: 0 }}>Für diesen Umkreis sind keine Daten /
                    Relevanz vorhanden.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {visibleFeatures.map((feature, fIndex) => (
                        <div
                            key={fIndex}
                            style={{
                                padding: '10px',
                                backgroundColor: '#fff',
                                borderRadius: '4px',
                                border: '1px solid #edf2f7',
                                position: 'relative',
                                cursor: feature._geometry ? 'pointer' : 'default',
                                transition: 'border-color 0.2s'
                            }}
                            onClick={() => {
                                if (feature._geometry && setHighlightFeature) {
                                    setHighlightFeature(feature._geometry);
                                }
                            }}
                            onMouseEnter={(e) => {
                                if (feature._geometry) {
                                    e.currentTarget.style.borderColor = '#3182ce';
                                    e.currentTarget.style.boxShadow = '0 0 5px rgba(49, 130, 206, 0.3)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (feature._geometry) {
                                    e.currentTarget.style.borderColor = '#edf2f7';
                                    e.currentTarget.style.boxShadow = 'none';
                                }
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: '-8px',
                                left: '-8px',
                                backgroundColor: feature._geometry ? '#3182ce' : '#718096',
                                color: 'white',
                                fontSize: '0.7rem',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                                fontWeight: 'bold'
                            }}>
                                {fIndex + 1}
                            </div>
                            {schema.fields.map((field, i) => {
                                const val = feature[field.key];
                                const displayVal = (val === null || val === undefined || val === '') ?
                                    <span
                                        style={{ color: '#a0aec0', fontStyle: 'italic' }}>Keine Angabe (vom Amt)</span> :
                                    <strong>{val}</strong>;
                                return (
                                    <div key={i} style={{ marginBottom: '4px', fontSize: '0.95rem', marginLeft: '10px' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            width: '220px',
                                            color: '#4a5568'
                                        }}>{field.label}:</span>
                                        {displayVal}
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {hiddenCount > 0 && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            style={{
                                marginTop: '5px',
                                padding: '6px',
                                backgroundColor: 'transparent',
                                border: '1px dashed #cbd5e0',
                                color: '#4a5568',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            {expanded ? '▲ Weniger anzeigen' : `▼ ${hiddenCount} weitere Ergebnisse anzeigen`}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
