import json
from textblob import TextBlob
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import sys
import urllib.parse  # To decode the URI encoded text

def combined_sentiment_analysis(text):
    vader_analyzer = SentimentIntensityAnalyzer()
    blob = TextBlob(text)
    blob_polarity = blob.sentiment.polarity
    vader_scores = vader_analyzer.polarity_scores(text)
    vader_compound = vader_scores['compound']
    
    def get_sentiment_classification(polarity):
        if polarity > 0.5:
            return "Very Positive 😊"
        elif polarity > 0.1:
            return "Positive 🙂"
        elif polarity >= -0.1 and polarity <= 0.1:
            return "Neutral 😐"
        elif polarity >= -0.5:
            return "Negative 😞"
        else:
            return "Very Negative 😡"
    
    combined_polarity = blob_polarity * 0.6 + vader_compound * 0.4
    overall_sentiment = get_sentiment_classification(combined_polarity)
    
    return {"sentiment": overall_sentiment}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: No review text provided")
        sys.exit(1)

    text = sys.argv[1]  # Review text passed as an argument
    decoded_text = urllib.parse.unquote(text)  # Decode the review text

    try:
        result = combined_sentiment_analysis(decoded_text)
        # Ensure ASCII characters are not escaped (output with emojis)
        print(json.dumps(result))
    except Exception as e:
        print(f"Error running sentiment analysis: {e}")
        sys.exit(1)
