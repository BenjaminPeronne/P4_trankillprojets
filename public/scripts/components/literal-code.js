// Use code in template literals
const str_tag = (strs, ...vals) => strs.reduce((final, str, i) => final + vals[i - 1] + str);
const html = str_tag;
const css = str_tag;
