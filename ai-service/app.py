from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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

# Download NLTK data
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

app = FastAPI(title="Grievance AI Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize text preprocessing
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words('english'))

# Category keywords mapping
CATEGORY_KEYWORDS = {
    'Municipal': ['road', 'street', 'pothole', 'garbage', 'waste', 'drainage', 'sewage', 'streetlight', 'park', 'municipal', 'city', 'urban', 'sidewalk', 'traffic light', 'public toilet', 'public space'],
    'Healthcare': ['hospital', 'clinic', 'doctor', 'medicine', 'health', 'medical', 'treatment', 'patient', 'ambulance', 'pharmacy', 'nurse', 'healthcare', 'health care', 'heart', 'stroke', 'cardiac', 'emergency', 'surgery', 'disease', 'illness', 'symptom', 'diagnosis', 'prescription', 'medication', 'therapy', 'vaccine', 'covid', 'coronavirus', 'fever', 'pain', 'injury', 'wound', 'blood', 'cancer', 'diabetes', 'hypertension', 'asthma', 'infection', 'virus', 'bacteria'],
    'Education': ['school', 'college', 'university', 'teacher', 'student', 'education', 'exam', 'admission', 'curriculum', 'tuition', 'scholarship', 'textbook', 'library', 'classroom', 'principal', 'faculty'],
    'Transport': ['bus', 'train', 'metro', 'traffic', 'parking', 'vehicle', 'transport', 'road', 'highway', 'public transport', 'taxi', 'cab', 'subway', 'tram', 'bike', 'bicycle', 'lane'],
    'Utilities': ['electricity', 'water', 'power', 'gas', 'internet', 'phone', 'utility', 'bill', 'connection', 'electric', 'plumbing', 'heating', 'cooling', 'ac', 'air conditioning', 'sewer', 'cable'],
    'Other': []
}

# Initialize models
vectorizer = None
classifier = None
MODEL_DIR = 'models'

def preprocess_text(text):
    """Preprocess text for analysis"""
    if not text:
        return ""
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove special characters and digits
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    
    # Tokenize
    tokens = word_tokenize(text)
    
    # Remove stopwords and lemmatize
    tokens = [lemmatizer.lemmatize(token) for token in tokens if token not in stop_words]
    
    return ' '.join(tokens)

def train_category_classifier():
    """Train a simple category classifier using keyword matching and TF-IDF"""
    global vectorizer, classifier
    
    # Training data based on keywords
    training_texts = []
    training_labels = []
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        if category != 'Other':
            # Create training examples from keywords
            for keyword in keywords:
                training_texts.append(keyword)
                training_labels.append(category)
    
    # Add some generic examples
    training_texts.extend(['general issue', 'other problem', 'miscellaneous'])
    training_labels.extend(['Other', 'Other', 'Other'])
    
    # Vectorize
    vectorizer = TfidfVectorizer(max_features=1000, ngram_range=(1, 2))
    X = vectorizer.fit_transform(training_texts)
    
    # Train classifier
    classifier = LogisticRegression(max_iter=1000, random_state=42)
    classifier.fit(X, training_labels)
    
    # Save models
    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(f'{MODEL_DIR}/vectorizer.pkl', 'wb') as f:
        pickle.dump(vectorizer, f)
    with open(f'{MODEL_DIR}/classifier.pkl', 'wb') as f:
        pickle.dump(classifier, f)

def load_models():
    """Load pre-trained models or train new ones"""
    global vectorizer, classifier
    
    try:
        if os.path.exists(f'{MODEL_DIR}/vectorizer.pkl') and os.path.exists(f'{MODEL_DIR}/classifier.pkl'):
            with open(f'{MODEL_DIR}/vectorizer.pkl', 'rb') as f:
                vectorizer = pickle.load(f)
            with open(f'{MODEL_DIR}/classifier.pkl', 'rb') as f:
                classifier = pickle.load(f)
        else:
            train_category_classifier()
    except Exception as e:
        print(f"Error loading models: {e}. Training new models...")
        train_category_classifier()

def classify_category(text):
    """Classify complaint category"""
    if not text:
        return 'Other', 0.5
    
    # Preprocess
    processed_text = preprocess_text(text)
    
    # Keyword-based classification (prioritize this for accuracy)
    text_lower = text.lower()
    category_scores = {}
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword in text_lower)
        if score > 0:
            category_scores[category] = score
    
    # If we have strong keyword matches, use them (more reliable than ML)
    if category_scores:
        best_category = max(category_scores, key=category_scores.get)
        best_score = category_scores[best_category]
        
        # If keyword match is strong (score >= 2), prioritize it
        if best_score >= 2:
            confidence = min(best_score / 5.0, 1.0)
            return best_category, confidence
        
        # If single keyword match, still use it but with lower confidence
        # Then check ML model as secondary
        keyword_category = best_category
        keyword_confidence = min(best_score / 3.0, 0.7)
    
    # Use ML model if available (as secondary check)
    ml_category = None
    ml_confidence = 0.0
    if vectorizer and classifier:
        try:
            X = vectorizer.transform([processed_text])
            ml_category = classifier.predict(X)[0]
            ml_confidence = max(classifier.predict_proba(X)[0])
        except:
            pass
    
    # Decision logic: prefer keyword match if strong, otherwise use ML if confident
    if category_scores and best_score >= 2:
        return keyword_category, keyword_confidence
    elif ml_category and ml_confidence > 0.6:
        return ml_category, ml_confidence
    elif category_scores:
        return keyword_category, keyword_confidence
    elif ml_category:
        return ml_category, ml_confidence
    
    return 'Other', 0.5

def analyze_sentiment(text):
    """Analyze sentiment (simple rule-based approach)"""
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

def determine_priority(text, sentiment, category):
    """Determine priority based on sentiment and keywords"""
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

# Initialize models on startup
@app.on_event("startup")
async def startup_event():
    load_models()
    print("✅ AI Service initialized")

# Request/Response models
class ComplaintRequest(BaseModel):
    title: str
    description: str

class AnalysisResponse(BaseModel):
    category: str
    sentiment: str
    priority: str
    confidence: Optional[float] = 0.8

# Health check
@app.get("/")
async def root():
    return {"message": "Grievance AI Service is running", "status": "OK"}

@app.get("/api/health")
async def health():
    return {"status": "OK", "service": "AI Analysis Service"}

# Analyze complaint endpoint
@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_complaint(request: ComplaintRequest):
    try:
        # Combine title and description
        full_text = f"{request.title} {request.description}"
        
        # Classify category
        category, confidence = classify_category(full_text)
        
        # Debug logging
        print(f"📋 Complaint Analysis:")
        print(f"   Title: {request.title}")
        print(f"   Description: {request.description[:100]}...")
        print(f"   Classified Category: {category} (confidence: {confidence:.2f})")
        
        # Analyze sentiment
        sentiment = analyze_sentiment(full_text)
        
        # Determine priority
        priority = determine_priority(full_text, sentiment, category)
        
        print(f"   Sentiment: {sentiment}, Priority: {priority}")
        
        return AnalysisResponse(
            category=category,
            sentiment=sentiment,
            priority=priority,
            confidence=round(confidence, 2)
        )
    except Exception as e:
        print(f"❌ Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
