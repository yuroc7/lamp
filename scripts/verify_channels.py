"""Check configured authorized native channels without publishing anything."""
import json
from update_y7_sport_feed import validated_channels, CHANNEL_HEALTH

if __name__=='__main__':
    channels=validated_channels()
    print(json.dumps({'health':CHANNEL_HEALTH,'accepted':[{'id':c['id'],'title':c['title'],'checked_at':c['checked_at'],'media':c['health']} for c in channels]},ensure_ascii=False,indent=2))
