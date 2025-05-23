# read_metadata.py

import sys
import json
from naiinfo_getter import get_naidict_from_file

def extract_image_metadata(nai_dict, error_code):
    if error_code == 0:
        return {"error": "EXIF가 존재하지 않는 파일입니다."}
    elif error_code in (1, 2):
        return {"error": "EXIF는 존재하나 NAI로부터 만들어진 것이 아님."}
    elif error_code == 3:
        new_dict = {
            "prompt": nai_dict.get("prompt", ""),
            "negative_prompt": nai_dict.get("negative_prompt", "")
        }
        new_dict.update(nai_dict.get("option", {}))
        new_dict.update(nai_dict.get("etc", {}))

        # 캐릭터 프롬프트 처리
        character_prompts = []
        etc = nai_dict.get("etc", {})
        if "v4_prompt" in etc and "caption" in etc["v4_prompt"]:
            char_captions = etc["v4_prompt"]["caption"].get("char_captions", [])
            neg_char_captions = etc.get("v4_negative_prompt", {}).get("caption", {}).get("char_captions", [])

            for i, char in enumerate(char_captions):
                item = {
                    "prompt": char.get("char_caption", ""),
                    "negative_prompt": "",
                    "position": None
                }

                if "centers" in char and char["centers"]:
                    center = char["centers"][0]
                    item["position"] = [center.get("x", 0.5), center.get("y", 0.5)]

                if i < len(neg_char_captions):
                    item["negative_prompt"] = neg_char_captions[i].get("char_caption", "")

                character_prompts.append(item)

            if character_prompts:
                new_dict["characterPrompts"] = character_prompts

        return new_dict
    else:
        return {"error": "알 수 없는 오류 코드입니다."}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "이미지 경로를 인자로 입력하세요"}))
        sys.exit(1)

    image_path = sys.argv[1]
    try:
        nai_dict, error_code = get_naidict_from_file(image_path)
        result = extract_image_metadata(nai_dict, error_code)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        pass

if __name__ == "__main__":
    main()
