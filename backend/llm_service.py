import copy
import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI


def optimize_geo_data_for_llm(geo_data: dict, max_features_per_layer: int = 4) -> dict:
    """Entfernt Geometrien und limitiert die Anzahl der Features (Top-N nach Distanz)."""
    optimized = copy.deepcopy(geo_data)
    for layer_name, features in optimized.items():
        if isinstance(features, list):
            for feature in features:
                if "_geometry" in feature:
                    del feature["_geometry"]

            # Nach Distanz sortieren (falls vorhanden) und auf max_features_per_layer abschneiden
            # Fallback auf 99999, falls das Feld fehlt
            features.sort(
                key=lambda x: x.get("Distanz_zum_Standort_m", 99999) if isinstance(x.get("Distanz_zum_Standort_m"),
                                                                                   (int, float)) else 99999)
            optimized[layer_name] = features[:max_features_per_layer]

    return optimized


def analyze_geo_data(api_key: str, geo_data: dict, role: str, provider: str = "openai", oereb_data: dict = None) -> str:
    # Initialisiere das LLM mit dem übergebenen API-Key und Provider
    if provider == "gemini":
        llm = ChatGoogleGenerativeAI(google_api_key=api_key, model="gemini-3.1-flash-lite", temperature=0.5)
    else:
        llm = ChatOpenAI(api_key=api_key, model="gpt-3.5-turbo", temperature=0.5)

    # Rollenspezifischer Prompt
    if role == "private":
        system_msg = """Du bist ein analytischer Immobilien-Experte für Privatpersonen und Familien. 
Deine Aufgabe ist es, aus den übergebenen Geo-Rohdaten einen detaillierten, strukturierten und verständlichen Standortbericht zu generieren.

STRIKTE REGELN FÜR DIE AUSGABE:
1. KEINE EINLEITUNG: Verzichte komplett auf Floskeln wie "Hallo", "Als Ihr Berater" oder "Hier ist meine Einschätzung". Beginne direkt mit der ersten fachlichen Überschrift (z.B. "# Standortanalyse für Familien").
2. UMFASSENDE NUTZUNG DER DATEN: Gehe systematisch auf ALLE mitgelieferten Datenpunkte ein. Ignoriere keine Informationen wie Landwerte, Solarpotenzial, Schulen oder ÖV-Haltestellen. Nenne konkrete Distanzen in Metern. Nenne keine spezifischen Parzellennummern (wie "Parzelle 1128"), da diese im UI nicht sichtbar sind; sprich stattdessen vom "ausgewählten Grundstück".
3. AUSGEWOGENE GEWICHTUNG: Versteife dich nicht auf ein einzelnes Detail (z.B. Waldnähe), sondern werte die gesamte Lebensqualität, Infrastruktur, Umwelt und Naturgefahren aus.
4. KEIN ROH-JSON: Übersetze die technischen Keys (z.B. Lärmempfindlichkeitsstufe__ES_) in lesbaren Text.
5. FLIESSTEXT: Schreibe den Bericht in zusammenhängendem Fliesstext unter den jeweiligen Kapitelüberschriften. Verwende NIEMALS Aufzählungszeichen, Bulletpoints (* oder -) oder nummerierte Listen!

FORMATIERUNG:
Nutze Markdown. Gliedere den Bericht zwingend in folgende oder ähnliche Kapitel:
- Zusammenfassung der Lage
- Infrastruktur & Lebensqualität (Schulen, ÖV, etc.)
- Umwelt, Natur & Gefahren (Wald, Naturgefahren, Lärm)
- Bau- und Nutzungspotenzial (Zonen, Landwerte, Solar)"""
    else:
        system_msg = """Du bist ein strenger, professioneller Analyst für Baufirmen und Projektentwickler.
Deine Aufgabe ist es, aus den übergebenen Geo-Rohdaten ein messerscharfes Management-Summary für das Baugrundstück zu generieren.

STRIKTE REGELN FÜR DIE AUSGABE:
1. KEINE EINLEITUNG: Verzichte auf jegliche Begrüssungsfloskeln. Beginne sofort mit dem "# Management Summary".
2. UMFASSENDE NUTZUNG DER DATEN: Werte zwingend ALLE kritischen Faktoren aus (Altlasten, Grundwasser, Zonentyp, Ausnützungsziffer, Lärm, Gebäudehöhen, Landwerte). Nenne die spezifischen Distanzen und Werte aus dem JSON. Erwähne keine spezifischen Parzellennummern aus den Daten, beziehe dich stattdessen immer nur auf "das Baugrundstück".
3. ÖREB-PRIORITÄT: Falls ÖREB-Daten vorhanden sind, bilden diese das rechtliche Fundament. Umkreisdaten dienen nur als Kontext.
4. KEIN ROH-JSON: Formuliere die Parameter in professionellem Bericht-Stil aus.
5. FLIESSTEXT: Schreibe das Summary in zusammenhängendem Fliesstext unter den jeweiligen Kapitelüberschriften. Verwende NIEMALS Aufzählungszeichen, Bulletpoints (* oder -) oder nummerierte Listen!

FORMATIERUNG:
Nutze Markdown. Gliedere das Summary in Kapitel wie:
- Executive Summary
- Bau- und Zonenrecht (Zonentyp, Ziffern, Höhen)
- Baurisiken & Restriktionen (Altlasten, Gefahren, Waldabstand)
- Wirtschaftliches Potenzial (Landwerte, Solarpotenzial)"""

    # Geodaten für das LLM extrem optimieren (Top-N und ohne Geometrien)
    geo_data_for_llm = optimize_geo_data_for_llm(geo_data, max_features_per_layer=4)

    # Die Geodaten kommen nun bereits optimiert und vereinfacht
    geo_data_str = json.dumps(geo_data_for_llm, ensure_ascii=False)

    user_prompt = "Hier sind die ermittelten Geo-Daten aus der Umkreis-Suche (bereits limitiert auf die relevantesten/nächsten Treffer): {geo_data}"
    prompt_vars = {"geo_data": geo_data_str[:15000]}

    if oereb_data:
        user_prompt += "\n\nHier ist der verbindliche ÖREB-Auszug (Kataster) für die exakte Parzelle: {oereb_data}"
        prompt_vars["oereb_data"] = json.dumps(oereb_data, ensure_ascii=False)

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_msg),
        ("user", user_prompt)
    ])

    chain = prompt | llm

    # Logging für Docker-Logs
    formatted_prompt = prompt.format(**prompt_vars)
    print(
        f"\n========== SENDED PROMPT TO LLM ==========\n{formatted_prompt}\n==========================================\n",
        flush=True)

    try:
        response = chain.invoke(prompt_vars)
        return response.content
    except Exception as e:
        print(f"LLM Error: {e}", flush=True)
        return f"**Fehler bei der LLM-Abfrage:**\n\n{str(e)}"


def compare_geo_data(api_key: str, geo_data_1: dict, geo_data_2: dict, role: str, provider: str = "openai") -> str:
    """Sendet zwei Geodaten-Pakete an das LLM für einen 1vs1 Vergleich."""

    if provider == "gemini":
        llm = ChatGoogleGenerativeAI(google_api_key=api_key, model="gemini-3.1-flash-lite", temperature=0.5)
    else:
        llm = ChatOpenAI(api_key=api_key, model="gpt-3.5-turbo", temperature=0.5)

    if role == "private":
        system_msg = """Du bist ein beratender Immobilien-Experte für Privatpersonen und Familien.
Deine Aufgabe ist es, ZWEI verschiedene Standorte (Standort A und Standort B) anhand der übergebenen Geo-Rohdaten direkt miteinander zu vergleichen.

STRIKTE REGELN FÜR DIE AUSGABE:
1. KEINE EINLEITUNG: Beginne direkt mit der ersten fachlichen Überschrift (z.B. "# Standortvergleich für Familien").
2. DIREKTER VERGLEICH: Werte nicht zuerst A und dann B isoliert aus, sondern vergleiche thematisch (z.B. "Infrastruktur: Standort A hat X, Standort B punktet dafür mit Y").
3. ENTSCHEIDUNGSHILFE: Gib am Schluss eine klare Empfehlung ab, welcher Standort für eine Familie tendenziell besser geeignet ist.
4. KEIN ROH-JSON: Übersetze die technischen Keys in lesbaren Text.

Nutze Markdown. Gliedere den Bericht in:
- Zusammenfassung der beiden Standorte
- Infrastruktur & Lebensqualität im Vergleich
- Umwelt, Natur & Gefahren im Vergleich
- Fazit & Empfehlung"""
    else:
        system_msg = """Du bist ein strenger, professioneller Analyst für Baufirmen.
Deine Aufgabe ist es, ZWEI verschiedene Bauparzellen (Standort A und Standort B) anhand der Geo-Rohdaten in einem messerscharfen A/B-Vergleich zu evaluieren.

STRIKTE REGELN FÜR DIE AUSGABE:
1. KEINE EINLEITUNG: Beginne sofort mit dem "# A/B Management Summary".
2. VERGLEICHENDE ANALYSE: Vergleiche Baurisiken (Altlasten, Gefahren), Baurecht (Ausnützungsziffer, Zonen) und Potenzial (Landwerte) direkt miteinander.
3. KLARE KANTE: Nenne klar, welcher Standort das höhere Potenzial bzw. das geringere Risiko aufweist.

Nutze Markdown. Gliedere das Summary in:
- Executive Summary & Gewinner
- Bau- und Zonenrecht im Vergleich
- Baurisiken & Restriktionen im Vergleich
- Wirtschaftliches Potenzial im Vergleich"""

    gd1 = optimize_geo_data_for_llm(geo_data_1, max_features_per_layer=4)
    gd2 = optimize_geo_data_for_llm(geo_data_2, max_features_per_layer=4)

    gd1_str = json.dumps(gd1, ensure_ascii=False)
    gd2_str = json.dumps(gd2, ensure_ascii=False)

    user_prompt = "Hier sind die Geo-Daten für STANDORT A (limitiert auf die relevantesten/nächsten Treffer):\n{data_a}\n\nHier sind die Geo-Daten für STANDORT B (limitiert auf die relevantesten/nächsten Treffer):\n{data_b}"
    prompt_vars = {"data_a": gd1_str[:8000], "data_b": gd2_str[:8000]}

    prompt = ChatPromptTemplate.from_messages([("system", system_msg), ("user", user_prompt)])
    chain = prompt | llm

    try:
        response = chain.invoke(prompt_vars)
        return response.content
    except Exception as e:
        print(f"LLM Error: {e}", flush=True)
        return f"**Fehler beim LLM-Vergleich:**\n\n{str(e)}"
