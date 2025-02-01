import sys
from pymongo import MongoClient
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity
import json
from dotenv import load_dotenv
import os

load_dotenv()
mongo_uri = os.getenv('MONGO_URI')

# Fetch business data from MongoDB
def fetch_business_data():
    client = MongoClient(mongo_uri)
    db = client['test']
    collection = db['businesses']
    
    pipeline = [
        { "$unwind": "$reviews" },
        {
            "$group": {
                "_id": "$_id",
                "business_name": { "$first": "$b_name" },
                "average_rating": { "$avg": "$reviews.starRating" },
                "sentiments": { "$push": "$reviews.sentiment" },
                "review_texts": { "$push": "$reviews.reviewText" }
            }
        }
    ]
    data = list(collection.aggregate(pipeline))

    sentiment_mapping = {
        "Very Positive 😊": 2,
        "Positive 🙂": 1,
        "Neutral 😐": 0,
        "Negative 😞": -1,
        "Very Negative 😡": -2
    }

    for item in data:
        sentiments = item.get('sentiments', [])
        numeric_sentiments = [sentiment_mapping.get(s.strip(), 0) for s in sentiments if s.strip()]
        item['combined_sentiments'] = np.mean(numeric_sentiments) if numeric_sentiments else 0

    df = pd.DataFrame(data)
    df.rename(columns={"_id": "business_id", "combined_sentiments": "sentiment_score"}, inplace=True)
    df['review_text'] = df['review_texts'].apply(lambda x: " ".join(x))
    df['sentiment_score'] = df['sentiment_score'].fillna(0)
    
    return df

# Calculate feature similarities
def calculate_similarities(df):
    scaler = MinMaxScaler()
    numeric_features = scaler.fit_transform(df[['average_rating', 'sentiment_score']])
    
    vectorizer = TfidfVectorizer(stop_words='english')
    text_features = vectorizer.fit_transform(df['review_text'])
    
    combined_features = np.hstack([numeric_features, text_features.toarray()])
    combined_features = np.nan_to_num(combined_features, nan=0.0)
    
    similarity_matrix = cosine_similarity(combined_features)
    return similarity_matrix

# Recommend businesses
def recommend_businesses(df, similarity_matrix, business_id, top_n=4):
    df['business_id'] = df['business_id'].astype(str).str.strip().str.lower()
    business_id = str(business_id).strip().lower()

    if business_id not in df['business_id'].values:
        print(f"Error: Business ID '{business_id}' not found.")
        return []

    idx = df.index[df['business_id'] == business_id].tolist()[0]
    similarity_scores = list(enumerate(similarity_matrix[idx]))
    sorted_scores = sorted(similarity_scores, key=lambda x: x[1], reverse=True)

    top_indices = [i[0] for i in sorted_scores[1:top_n+1]]
    return df.iloc[top_indices].to_dict('records')

# Entry point for script
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python recommender.py <business_id>")
        sys.exit(1)

    business_id = sys.argv[1]
    df = fetch_business_data()
    similarity_matrix = calculate_similarities(df)
    recommendations = recommend_businesses(df, similarity_matrix, business_id)
    print(json.dumps(recommendations))
