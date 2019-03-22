import os
from os.path import dirname, isfile, join
import PyPDF2
import re
import subprocess

SENSITIVITY = 30

top_dir = join(dirname(__file__), '..')
data_dir = join(top_dir, 'data', 'us', 'orig')

DIGIT_RE = re.compile(r'[0-9]+')
def get_numbers(text):
    return set(int(match.group(0)) for match in DIGIT_RE.finditer(text))

for f in sorted(os.listdir(data_dir)):
    path = join(data_dir, f)
    if not isfile(path) or not f.endswith('bv.pdf'): continue

    print(f)
    out_path = join(top_dir, 'data', 'us', f.replace('bv.pdf', '.pdf'))
    if isfile(out_path):
        print('  skipping.')
        continue

    with open(path, 'rb') as pdf_file:
        reader = PyPDF2.PdfFileReader(pdf_file)
        print('  read.')
        numbers = [get_numbers(page.extractText()) for page in reader.pages]

        for page_idx, next_numbers in enumerate(zip(*[numbers[i:] for i in range(SENSITIVITY)])):
            works = all(i + 1 in next_numbers[i] for i in range(SENSITIVITY))
            if works:
                break

    if works:
        print('  Detected starting page: {}'.format(page_idx))
        subprocess.check_call(['cpdf', '-o', out_path, path, '{}-end'.format(page_idx + 1)])
