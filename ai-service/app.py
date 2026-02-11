from flask import Flask, request, jsonify
from flask_cors import CORS
from typing import Optional
import pickle
import os
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer

"""
Lightweight NLP service for SmartRedressal.

This Flask app does three things for every complaint:
- cleans up the text (title + description),
- guesses the department/category (Municipal, Healthcare, etc.),
- estimates sentiment and urgency so we can assign a priority.

It is intentionally simple, easy to read, and focused on explainability
rather than building a perfect ML model.
"""

# Make sure the required NLTK resources are available.
# These downloads are cached, so they only run the first time.
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet', quiet=True)

app = Flask(__name__)
CORS(app)

# Basic text‑preprocessing helpers used across the service.
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words("english"))

# A simple, human‑readable mapping from high‑level categories
# to the kinds of words we expect in those complaints.
CATEGORY_KEYWORDS = {
    'Municipal': ['road', 'street', 'pothole', 'garbage', 'waste', 'drainage', 'sewage', 'streetlight', 'park', 'municipal', 'city', 'urban', 'sidewalk', 'traffic light', 'public toilet', 'public space'],
    'Healthcare': ['hospital', 'clinic', 'doctor', 'medicine', 'health', 'medical', 'treatment', 'patient', 'ambulance', 'pharmacy', 'nurse', 'healthcare', 'health care', 'heart', 'stroke', 'cardiac', 'emergency', 'surgery', 'disease', 'illness', 'symptom', 'diagnosis', 'prescription', 'medication', 'therapy', 'vaccine', 'covid', 'coronavirus', 'fever', 'pain', 'injury', 'wound', 'blood', 'cancer', 'diabetes', 'hypertension', 'asthma', 'infection', 'virus', 'bacteria'],
    'Education': ['school', 'college', 'university', 'teacher', 'student', 'education', 'exam', 'admission', 'curriculum', 'tuition', 'scholarship', 'textbook', 'library', 'classroom', 'principal', 'faculty'],
    'Transport': ['bus', 'train', 'metro', 'traffic', 'parking', 'vehicle', 'transport', 'road', 'highway', 'public transport', 'taxi', 'cab', 'subway', 'tram', 'bike', 'bicycle', 'lane'],
    'Utilities': ['electricity', 'water', 'power', 'gas', 'internet', 'phone', 'utility', 'bill', 'connection', 'electric', 'plumbing', 'heating', 'cooling', 'ac', 'air conditioning', 'sewer', 'cable'],
    'Other': []
}

# In‑memory handles for our vectorizer and classifier.
vectorizer = None
classifier = None
MODEL_DIR = "models"


def preprocess_text(text: str) -> str:
    """
    Clean and normalize raw text so it is ready for analysis.

    Steps:
    - lowercase
    - strip punctuation and digits
    - tokenize
    - drop stopwords and lemmatize
    """
    if not text:
        return ""
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove special characters and digits
    text = re.sub(r"[^a-zA-Z\s]", "", text)
    
    # Tokenize
    tokens = word_tokenize(text)
    
    # Remove stopwords and lemmatize
    tokens = [lemmatizer.lemmatize(token) for token in tokens if token not in stop_words]
    
    return " ".join(tokens)


def train_category_classifier() -> None:
    """
    Train a tiny text classifier to roughly separate complaints into categories.

    We deliberately keep the training data simple and transparent by
    building it from the keyword lists above instead of loading a large,
    opaque dataset. The goal is to demonstrate the pipeline, not to
    ship a production‑grade model.
    """
    global vectorizer, classifier
    
    # Build a synthetic training set from our keyword lists.
    training_texts = []
    training_labels = []
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        if category != 'Other':
            # Create training examples from keywords
            for keyword in keywords:
                training_texts.append(keyword)
                training_labels.append(category)
    
    # Add some generic "other" examples so the model has a fallback.
    training_texts.extend(["general issue", "other problem", "miscellaneous"])
    training_labels.extend(["Other", "Other", "Other"])
    
    # Turn text into numeric features.
    vectorizer = TfidfVectorizer(max_features=1000, ngram_range=(1, 2))
    X = vectorizer.fit_transform(training_texts)
    
    # Train a simple linear classifier.
    classifier = LogisticRegression(max_iter=1000, random_state=42)
    classifier.fit(X, training_labels)
    
    # Persist the trained model so we do not retrain on every startup.
    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(f"{MODEL_DIR}/vectorizer.pkl", "wb") as f:
        pickle.dump(vectorizer, f)
    with open(f"{MODEL_DIR}/classifier.pkl", "wb") as f:
        pickle.dump(classifier, f)

def load_models() -> None:
    """
    Load models from disk if available; otherwise train them from scratch.

    This keeps startup fast in normal use but still lets the service
    recover automatically if the model files are missing or corrupted.
    """
    global vectorizer, classifier
    
    try:
        if os.path.exists(f"{MODEL_DIR}/vectorizer.pkl") and os.path.exists(f"{MODEL_DIR}/classifier.pkl"):
            with open(f"{MODEL_DIR}/vectorizer.pkl", "rb") as f:
                vectorizer = pickle.load(f)
            with open(f"{MODEL_DIR}/classifier.pkl", "rb") as f:
                classifier = pickle.load(f)
        else:
            train_category_classifier()
    except Exception as e:
        print(f"Error loading models: {e}. Training new models...")
        train_category_classifier()

def classify_category(text: str):
    """
    Guess which high‑level category a complaint belongs to.

    First we try a very transparent keyword‑based approach.
    If that is inconclusive, we fall back to the ML model.
    """
    if not text:
        return 'Other', 0.5
    
    # Preprocess
    processed_text = preprocess_text(text)
    
    # Keyword‑based classification (prioritize this for interpretability).
    text_lower = text.lower()
    category_scores = {}
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword in text_lower)
        if score > 0:
            category_scores[category] = score
    
    # If we have strong keyword matches, trust them over the ML model.
    if category_scores:
        best_category = max(category_scores, key=category_scores.get)
        best_score = category_scores[best_category]
        
        # If keyword match is strong (score >= 2), prioritize it
        if best_score >= 2:
            confidence = min(best_score / 5.0, 1.0)
            return best_category, confidence
        
        # If there is only a weak match, keep it but also consult the model.
        keyword_category = best_category
        keyword_confidence = min(best_score / 3.0, 0.7)
    
    # Use the ML model if it is loaded.
    ml_category = None
    ml_confidence = 0.0
    if vectorizer and classifier:
        try:
            X = vectorizer.transform([processed_text])
            ml_category = classifier.predict(X)[0]
            ml_confidence = max(classifier.predict_proba(X)[0])
        except:
            pass
    
    # Decision logic: prefer strong keyword signals, otherwise trust ML
    # only when it is reasonably confident.
    if category_scores and best_score >= 2:
        return keyword_category, keyword_confidence
    elif ml_category and ml_confidence > 0.6:
        return ml_category, ml_confidence
    elif category_scores:
        return keyword_category, keyword_confidence
    elif ml_category:
        return ml_category, ml_confidence
    
    return 'Other', 0.5

def analyze_sentiment(text: str) -> str:
    """
    Very small, rule‑based sentiment checker.

    Looks for a handful of positive and negative keywords and
    returns "Positive", "Neutral" or "Negative".
    """
    if not text:
        return 'Neutral'
    
    text_lower = text.lower()
    
    # Negative keywords
    negative_keywords = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'disappointed', 
                        'frustrated', 'angry', 'urgent', 'emergency', 'critical', 'broken',
                        'failed', 'not working', 'problem', 'issue', 'complaint']
    
    # Positive keywords
    positive_keywords = ['good', 'great', 'excellent', 'satisfied', 'happy', 'thank', 'appreciate']
    
    negative_count = sum(1 for keyword in negative_keywords if keyword in text_lower)
    positive_count = sum(1 for keyword in positive_keywords if keyword in text_lower)
    
    if negative_count > positive_count and negative_count > 2:
        return 'Negative'
    elif positive_count > negative_count:
        return 'Positive'
    else:
        return 'Neutral'

def determine_priority(text: str, sentiment: str, category: str) -> str:
    """
    Derive a rough priority level for the complaint.

    We combine:
    - explicit urgency words in the text,
    - how negative the sentiment is,
    - and whether the domain is safety‑critical (health, utilities).
    """
    text_lower = text.lower()
    
    # High priority keywords
    high_priority_keywords = ['urgent', 'emergency', 'critical', 'immediate', 'asap', 
                             'dangerous', 'safety', 'accident', 'fire', 'flood']
    
    # Check for high priority keywords
    if any(keyword in text_lower for keyword in high_priority_keywords):
        return 'Critical'
    
    # High priority categories
    if category in ['Healthcare', 'Utilities'] and sentiment == 'Negative':
        return 'High'
    
    # Medium priority
    if sentiment == 'Negative':
        return 'High'
    elif sentiment == 'Neutral':
        return 'Medium'
    else:
        return 'Low'


def init_models() -> None:
    """Convenience wrapper so the `__main__` block stays clean."""
    load_models()
    print("✅ AI Service initialized")


# Health check
@app.route("/", methods=["GET"])
def root():
    return jsonify({"message": "Grievance AI Service is running", "status": "OK"})


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "OK", "service": "AI Analysis Service"})


# Analyze complaint endpoint
@app.route("/api/analyze", methods=["POST"])
def analyze_complaint():
    try:
        data = request.get_json() or {}
        title = data.get("title", "")
        description = data.get("description", "")

        # Combine title and description
        full_text = f"{title} {description}"
        
        # Classify category
        category, confidence = classify_category(full_text)
        
        # Debug logging
        print(f"📋 Complaint Analysis:")
        print(f"   Title: {title}")
        print(f"   Description: {description[:100]}...")
        print(f"   Classified Category: {category} (confidence: {confidence:.2f})")
        
        # Analyze sentiment
        sentiment = analyze_sentiment(full_text)
        
        # Determine priority
        priority = determine_priority(full_text, sentiment, category)
        
        print(f"   Sentiment: {sentiment}, Priority: {priority}")
        
        return jsonify(
            {
                "category": category,
                "sentiment": sentiment,
                "priority": priority,
                "confidence": round(confidence, 2),
            }
        )
    except Exception as e:
        print(f"❌ Analysis error: {str(e)}")
        return jsonify({"detail": f"Analysis error: {str(e)}"}), 500


if __name__ == "__main__":
    init_models()
    app.run(host="0.0.0.0", port=8000)
