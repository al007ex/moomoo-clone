const profanityList = ["cunt", "whore", "fuck", "shit", "faggot", "nigger",
    "nigga", "dick", "vagina", "minge", "cock", "rape", "cum", "sex",
    "tits", "penis", "clit", "pussy", "meatcurtain", "jizz", "prune",
    "douche", "wanker", "damn", "bitch", "dick", "fag", "bastard"];
    
export const filter_chat = (c) => {

    const chat = c.slice(0, 30);
    
    let result = "";
    for (let i = 0; i < chat.length; i++) {
        const point = chat.charCodeAt(i);

        if (point < 0 || point > 126) {
            continue;
        }

        result += chat.charAt(i);
    }

    for (const profanity of profanityList) {
        const cow = "o".repeat(profanity.length - 1);
        const regex = new RegExp(profanity, "gi");

        result = result.replaceAll(regex, "M" + cow);
    }

    return result;

};
    