import json
import ast

log_file = r'C:\Users\malib\.gemini\antigravity\brain\cba7b766-36c6-478f-9d42-2d7788536251\.system_generated\logs\overview.txt'
with open(log_file, 'r', encoding='utf-8') as f:
    lines = [json.loads(l) for l in f if l.strip()]

with open('chapter4.tex', 'r', encoding='utf-8') as f:
    text = f.read()

applied = 0
for l in lines:
    if l.get('type') == 'PLANNER_RESPONSE':
        for call in l.get('tool_calls', []):
            if call['name'] in ['replace_file_content', 'multi_replace_file_content']:
                args = call['args']
                if isinstance(args, str):
                    try:
                        args = json.loads(args)
                    except:
                        continue
                
                if 'chapter4.tex' in args.get('TargetFile', ''):
                    chunks = []
                    if call['name'] == 'replace_file_content':
                        chunks = [args]
                    else:
                        c_str = args.get('ReplacementChunks', [])
                        if isinstance(c_str, str):
                            try:
                                chunks = json.loads(c_str, strict=False)
                            except Exception as e:
                                try:
                                    chunks = ast.literal_eval(c_str)
                                except Exception as e2:
                                    print(f"Failed to parse chunks: {e2}")
                                    continue
                        else:
                            chunks = c_str
                    
                    for chunk in chunks:
                        target = chunk['TargetContent']
                        replacement = chunk['ReplacementContent']
                        if target in text:
                            text = text.replace(target, replacement)
                            applied += 1

with open('chapter4.tex', 'w', encoding='utf-8') as f:
    f.write(text)

print(f"Restoration complete. Applied {applied} edits.")
