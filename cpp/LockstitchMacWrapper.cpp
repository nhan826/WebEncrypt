// LockstitchMacWrapper.cpp
// Mac-compatible wrapper that adapts Lockstitch for macOS
// Keeps original source unchanged and wraps it with platform-specific code

#include "Lockstitch.h"
#include <fstream>
#include <codecvt>
#include <locale>
#include <iostream>
#include <algorithm>
#include <filesystem>
#include <stdio.h>
#include <sys/stat.h>

#ifdef __APPLE__
#include <mach-o/dyld.h>
#include <limits.h>
#endif

using namespace std;
namespace fs = std::filesystem;

#define MUL_DIV_DATA_SIZE 40000
Lockstitch* Lockstitch::instance = nullptr;

// Helper function to convert wstring to string for Mac file operations
static string wstring_to_string(const wstring& wstr) {
    wstring_convert<codecvt_utf8<wchar_t>> converter;
    return converter.to_bytes(wstr);
}

// Helper function to convert string to wstring for Mac
static wstring string_to_wstring(const string& str) {
    wstring_convert<codecvt_utf8<wchar_t>> converter;
    return converter.from_bytes(str);
}

Lockstitch::Lockstitch()
{
    char path[PATH_MAX];
    string exePath = "";

#ifdef __APPLE__
    uint32_t size = PATH_MAX;
    _NSGetExecutablePath(path, &size);
    exePath = path;
    int indx = exePath.find_last_of('/');
    exePath = exePath.substr(0, indx + 1);
#endif

    // Try to load from Resources in app bundle first
    string codeFile = exePath + "../Resources/Code.txt";
    ifstream ifs(codeFile);
    
    // If not found, try current directory
    if (!ifs.good()) {
        codeFile = exePath + "Code.txt";
        ifs.open(codeFile);
    }
    
    string content((istreambuf_iterator<char>(ifs)),
        (istreambuf_iterator<char>()));

    if (content != "")
    {
        m_constantString = content.c_str();
    }
    else
        m_constantString = "1bd4acef81b676f1bb87379ecad3e03ab937e8cca7fd6479d8cc1277ef68c2968c50ef933e45709fc7e98b3b43e69858fcfeffc870d0a5d01e50d4451019dc02b961fa5d512383b65eab63f9d2fb7ae6cdbe0137ea33aa028f9425471be7a5ed927e6b5ecd50684984d225445cdfbccce6d11ad9a2af05f394d368e80cabfe98661bea8dcd68ec3d32ba902bd0ab2ffd9e5ad7914bc085aafbfcba176d4011358c76aead51a45ca84ebaf7db296cb80ed0f988f01525c40ef186e1fc8f7048e96c9f3c1b55fbce946cc3267010f345fadafd37abe9e603e49f9d78aabebbf05d9b5446199dfce2cdf93d14ab61782bbd55702fe02db2980ff86b46ba691b29c1102fa71025a5a9eed8c98f0e55301388fe99bbdffa3542467dcd67c1814753338fc3d1a35025898100b753b2546f4ee9403548ed62a4de1277ef68c2968c50ef933e3b30bc3c57e8f60adf84f25ef2de3b48671a677072d32bd0d9612e519f52108f0e93d9a7a2e03aa13c4cc25f2bd2081b04a33762d7a6bf71a79d878c1a30e058215a52b44b8eb860a59eeb5a27e956f25ef332a5540258a97a2428645491f99a471412d0a693687fa7a2e09a16ceaa18e9d6808ef3375702df49d153cfb38d8f4c69aa25bf8313e8ddfc492fe99f2bc65a0722758f6f5ad4837bc26818bcd2b89d73b98fc6fa9bd5822dc7f55fde23642eb25c08248e2899ba23f8c999989b46dc70d4b5f5dbbe9365927b1d560d019d2030ef22758f6f5ad4837bc26818bcd2b89d79fc02955f7296fe67df4bc5e4f406bf56f25ef387096f7ad241c33bb6818a118faf98179fa5a62a348667a1b002508ecab12b1a98565dbc75f57512a8d3235b1fe37c51c804a00753ee0d2000263e04d35e00ae930156f25ef3db71d49b1ab12fb4d6c38a1617113a0860bb3f2300514e9d915f71fc27a2d8d452d23b77951d3b2b32fabf3ae51a88e95cd3645d01e6b78a102e497657986351fc220d83d38f923ded452646b64ef06447ba05fdb978dd04d21448bf56f25ef42fdc34822a50a5e30796772f14fdf179ae2b886351fc30df3b4af7e6317f818fea88f6a504d9ccf1ea9e6447ba017395f4a6dd65dd62d9b0317a9193feed32635b5b0f1ae3a307ae14bf7411c804a005095bef86c5a198cc5eacd9b1a67d093b137c51c804a007aa54871249c5c1a9e9d328ada74da971cc40542b03314f6aca059c64664b56f25ef484429edbab9008a717478a118faf98179fa5a62a348667a1b002508ecaad8c2cdffd05361a6e56a662727685d040b2399688137404fa53036f72965bfdd4e00b1430dc0e02a39c64677d7ed10977ecbf1d72927e2cfa4bf7768361032c8a76772d72972aebd5b2342f4c00d9cfa2f25ef4d8b0f39119d7e4abf33ffaf80a7afe2933d8b42590f9b99e52102100690cec227e5b9b6fada4b78a";
}

// Implementation of all other methods from original Lockstitch.cpp
// Copy-pasted with Mac-specific file handling modifications

int Lockstitch::getPreNumBufSize()
{
    int len = m_constantString.length();
    int i = 0;
    while (len > 0)
    {
        ++i;
        len /= 10;
    }

    return i;
}

string Lockstitch::xorString(const char* const str1, const char* const str2, int len)const
{
    char* buf = new char[len + 1];
    int pLen = strlen(str1) - 1;
    for (int i = 0, j = 0; i < len; ++i, j = j == pLen ? 0 : j + 1)
        buf[i] = str1[j] ^ str2[i];

    buf[len] = 0;
    string str(buf, len);  // Use length constructor to handle null bytes
    delete[]buf;

    return str;
}

wstring Lockstitch::xorString(const wchar_t* const str1, const wchar_t* const str2, int len)const
{
    wchar_t* buf = new wchar_t[len + 1];
    int pLen = wcslen(str1) - 1;
    for (int i = 0, j = 0; i < len; ++i, j = j == pLen ? 0 : j + 1)
        buf[i] = str1[j] ^ str2[i];

    buf[len] = 0;
    wstring str(buf);
    delete[]buf;

    return str;
}

string Lockstitch::xorString(const char* const str1, string& str2, int len)const
{
    char* buf = new char[len + 1];
    int pLen = strlen(str1) - 1;
    for (int i = 0, j = 0; i < len; ++i, j = j == pLen ? 0 : j + 1)
        buf[i] = str1[j] ^ str2[i];

    buf[len] = 0;
    string str(buf, len);  // Use length constructor to handle null bytes
    delete[]buf;

    return str;
}

wstring Lockstitch::xorString(const wchar_t* const str1, wstring& str2, int len)const
{
    wchar_t* buf = new wchar_t[len + 1];
    int pLen = wcslen(str1)-1;
    for (int i = 0, j = 0; i < len; ++i, j = j == pLen ? 0 : j + 1)
        buf[i] = str1[j] ^ str2[i];

    buf[len] = 0;
    wstring str(buf);
    delete[]buf;

    return str;
}

void Lockstitch::xorString(vector<unsigned char>& str1, const string str2)
{
    int len = str2.length();
    for (int i = 0, j = 0; i < str1.size(); ++i, ++j)
    {
        if (j == len)
            j = 0;

        str1[i] ^= str2[j];
    }
}

// Continue with rest of implementation - mulString, divString, etc.
// [I'll include the key functions needed for file encryption]

vector<unsigned char> Lockstitch::mulString(vector<unsigned char>& str1, string str2)
{
    vector<unsigned char>destStr;
    int n1 = str1.size() * 8;
    int n2 = str2.length() * 8;
    int n = n1 + n2;
    if (n == 0)
        return destStr;

    unsigned char* V1 = new unsigned char[n1];
    unsigned char* V2 = new unsigned char[n2];
    unsigned char* V = new unsigned char[n];
    for (int j = 0, i = str1.size() - 1; i >= 0; i--)
    {
        int c = str1[i];
        int mask = 0x1;
        for (int k = 0; k < 8; k++)
        {
            V1[j++] = c & mask ? 1 : 0;
            mask <<= 1;
        }
    }

    for (int j = 0, i = str2.length() - 1; i >= 0; i--)
    {
        int c = str2[i];
        int mask = 0x1;
        for (int k = 0; k < 8; k++)
        {
            V2[j++] = c & mask ? 1 : 0;
            mask <<= 1;
        }
    }

    memset(V, 0, n);
    int overflow, bit1, bit2, temp;
    for (int i = 0; i < n2; i++)
    {
        overflow = 0;
        if (V2[i] == 1)
        {
            for (int j = 0; j < n1; j++)
            {
                bit1 = V1[j];
                bit2 = V[i + j];
                temp = bit1 + bit2 + overflow;
                if ((temp & 1) == 1)
                    V[i + j] = 1;
                else
                    V[i + j] = 0;
                overflow = (temp >> 1);
            }
            if (overflow == 1)
                V[i + n1] = 1;
        }
    }

    int N = n / 8;
    int mask = 0x80;
    for (int c = 0, j = 0, k = 0, i = n - 1; i >= 0; i--)
    {
        if (V[i])
            c += mask;
        mask >>= 1;
        j++;
        if (j == 8)
        {
            destStr.push_back(c);
            c = 0;
            j = 0;
            mask = 0x80;
        }
    }

    delete[]V1;
    delete[]V2;
    delete[]V;

    return destStr;
}

vector<unsigned char> Lockstitch::divString(vector<unsigned char>& str1, string str2)
{
    vector<unsigned char> output;

    int n1 = str1.size() * 4;
    int n2 = str2.length() * 8;
    int n = n1 - n2 + 1;
    if (n1 == 0 || n2 == 0 || n1 < n2)
        return output;

    unsigned char* V1 = new unsigned char[n1];
    unsigned char* V2 = new unsigned char[n2];
    unsigned char* V = new unsigned char[n];

    for (int i = 0, j = n1 - 1; i < str1.size(); i++)
    {
        int c = 0;
        if ((str1[i] >= '0') && (str1[i] <= '9'))
            c = str1[i] - '0';
        else if ((str1[i] >= 'a') && (str1[i] <= 'f'))
            c = str1[i] - 'a' + 10;
        int mask = 0x8;
        for (int k = 0; k < 4; k++)
        {
            if (c & mask)
                V1[j] = 1;
            else
                V1[j] = 0;
            mask = mask >> 1;
            j--;
        }
    }

    for (int j = 0, i = str2.length() - 1; i >= 0; i--)
    {
        int c = str2[i];
        int mask = 0x1;
        for (int k = 0; k < 8; k++)
        {
            V2[j++] = c & mask ? 1 : 0;
            mask <<= 1;
        }
    }

    memset(V, 0, n);

    while ((n1 > 0) && (V1[n1 - 1] == 0))
        n1--;

    while ((n2 > 0) && (V2[n2 - 1] == 0))
        n2--;

    if ((n1 == 0) || (n2 == 0))
    {
        delete[]V1;
        delete[]V2;
        delete[]V;

        return output;
    }

    int overflow, bit1, bit2, temp;
    n = n1 - n2 + 1;
    int i = n1 - n2;
    while (i >= 0)
    {
        bool bLarge = true;
        if ((n1 - i) < n2)
            bLarge = false;
        else if ((n1 - i) == n2)
        {
            for (int j = n2 - 1; j >= 0; j--)
            {
                if (V1[i + j] > V2[j])
                {
                    bLarge = true;
                    break;
                }
                if (V1[i + j] < V2[j])
                {
                    bLarge = false;
                    break;
                }
            }
        }
        else
            bLarge = true;

        if (bLarge)
        {
            V[i] = 1;
            overflow = 0;
            for (int j = 0; j < n2; j++)
            {
                bit1 = 0;
                if (((i + j) < n1) && (V1[i + j] == 1))
                    bit1 = 1;
                if (V2[j] == 1)
                    bit2 = 1;
                else
                    bit2 = 0;
                temp = bit1 - bit2 - overflow;
                if (temp == 0)
                {
                    overflow = 0;
                    V1[i + j] = 0;
                }
                else if (temp == 1)
                {
                    overflow = 0;
                    V1[i + j] = 1;
                }
                else if (temp == -1)
                {
                    overflow = 1;
                    V1[i + j] = 1;
                }
                else if (temp == -2)
                {
                    overflow = 1;
                    V1[i + j] = 0;
                }
                else
                    throw ("Error");
            }

            if (overflow == 1)
                V1[n1 - 1] = 0;

            int j = n1 - 1;
            while (j >= 0)
            {
                if (V1[j] == 1)
                    break;
                j--;
            }
            n1 = j + 1;
        }
        else
        {
            V[i] = 0;
        }
        i--;
    }

    if (V[n - 1] == 0)
        n--;

    int N = (n + 7) / 8;
    output.resize(N);
    int j = N - 1;
    int k = 0;
    int mask = 0x1;
    int c = 0;
    for (i = 0; i < n; i++)
    {
        if (V[i] == 1)
            c = c + mask;
        mask = mask << 1;
        k++;
        if (k == 8)
        {
            output[j--] = c;
            mask = 0x1;
            k = 0;
            c = 0;
        }
    }
    if (k != 0)
        output[j] = c;

    delete[]V1;
    delete[]V2;
    delete[]V;

    return output;
}

// String encryption methods
string Lockstitch::encrypt(string& content)
{
    int number = getEncodePaterStartPos();
    string str1 = to_string(number);
    int bufSize = getPreNumBufSize();
    int dif = bufSize - str1.length();
    while (dif-- > 0)
        str1 = "0" + str1;

    string str2 = m_constantString.substr(number);
    str2 = str2.substr(0, 10);

    vector<unsigned char> contentV = stringToCharList(content);
    vector<unsigned char> str3V = mulString(contentV, str2);

    str1 = xorString(prefixData, str1, bufSize);
    string encryptedContent = charListToHexString(str3V);
    string str(encryptedContent.begin(), encryptedContent.end());

    return str1 + str;
}

wstring Lockstitch::encrypt(wstring& content)
{
    int number = getEncodePaterStartPos();
    wstring str1 = to_wstring(number);
    int bufSize = getPreNumBufSize();
    int dif = bufSize - str1.length();
    while (dif-- > 0)
        str1 = L"0" + str1;

    string str2 = m_constantString.substr(number);
    str2 = str2.substr(0, 10);

    vector<unsigned char> contentV = wstringToCharList(content);
    vector<unsigned char> str3V = mulString(contentV, str2);

    str1 = xorString(prefixData_t, str1, bufSize);
    string encryptedContent = charListToHexString(str3V);
    wstring ws(encryptedContent.begin(), encryptedContent.end());

    return str1 + ws;
}

string Lockstitch::decrypt(string& content)
{
    int len = getPreNumBufSize();
    if (content.length() <= len)
        return "Invalid input. The string is too short.";

    string str1 = xorString(prefixData, content, len);
    int number;
    try {
        number = stoi(str1);
    }
    catch (invalid_argument& ex) {
        return "Invalid input. The content is not valid encrypted data.";
    }
    catch (out_of_range& ex) {
        return "Invalid input. The content format is incorrect.";
    }
    
    string str2 = content.substr(len);
    string str3 = m_constantString.substr(number);
    str3 = str3.substr(0, 10);

    vector<unsigned char>data(str2.begin(), str2.end());
    vector<unsigned char> output = divString(data, str3.c_str());
    return charListToString(output);
}

wstring Lockstitch::decrypt(wstring& content)
{
    int len = getPreNumBufSize();
    if (content.length() <= len)
        return L"Invalid input. The string is too short.";

    wstring str1 = xorString(prefixData_t, content,len);
    int number;
    try {
        number = stoi(str1);
    }
    catch (invalid_argument ex) {
        return L"Invalid input. The input content is not valid Claudo encrypted data";
    }
    wstring str2 = content.substr(len);
    string str3 = m_constantString.substr(number);
    str3 = str3.substr(0, 10);

    vector<unsigned char>data(str2.begin(), str2.end());
    vector<unsigned char> output = divString(data, str3.c_str());
    return charListToWString(output);
}

// Helper methods
vector<unsigned char> Lockstitch::stringToCharList(string& str)
{
    const size_t newsizew = str.length();
    vector<unsigned char> v(newsizew);
    memcpy(v.data(), str.c_str(), newsizew);

    return v;
}

vector<unsigned char> Lockstitch::wstringToCharList(wstring& wstr)
{
    const size_t newsizew = wstr.length() * 2;
    vector<unsigned char> v(newsizew);
    memcpy(v.data(), wstr.c_str(), newsizew);

    return v;
}

string Lockstitch::charListToString(vector<unsigned char>& v)
{
    size_t n = v.size() + 1;
    char* data = new char[n];
    memcpy(data, v.data(), n);
    data[n - 1] = 0;
    string str(data);
    delete[]data;

    return str;
}

wstring Lockstitch::charListToWString(vector<unsigned char>& v)
{
    size_t n = (v.size() >> 1) + 1;
    wchar_t* data = new wchar_t[n];
    memcpy(data, v.data(), v.size());
    data[n - 1] = 0;
    wstring wstr(data);
    delete[]data;

    return wstr;
}

string Lockstitch::charListToHexString(vector<unsigned char>& arr)
{
    char const hex[16] = { '0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f' };
    string str;
    for (int i = 0; i < arr.size(); ++i) {
        const unsigned char ch = arr[i];
        str += hex[(ch & 0xF0) >> 4];
        str += hex[ch & 0xF];
    }

    return str;
}

vector<unsigned char> Lockstitch::charListToHexCharArray(vector<unsigned char>& arr)
{
    char const hex[16] = { '0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f' };
    vector<unsigned char> str;
    for (int i = 0; i < arr.size(); ++i) {
        const unsigned char ch = arr[i];
        str.push_back(hex[(ch & 0xF0) >> 4]);
        str.push_back(hex[ch & 0xF]);
    }

    return str;
}

string Lockstitch::loadTxtFile(string strFilePath)
{
    std::ifstream file(strFilePath);
    file.seekg(0, std::ios::end);
    size_t size = file.tellg();
    std::string buffer(size, ' ');
    file.seekg(0);
    file.read(&buffer[0], size);
    file.close();

    return buffer;
}

// Mac-compatible wstring file loading
wstring Lockstitch::loadTxtFile(wstring strFilePath)
{
    string utf8_path = wstring_to_string(strFilePath);
    ifstream file(utf8_path, ios::binary);
    
    if (!file.good())
        return L"Error. Failed to open file - " + strFilePath;

    file.seekg(0, ios::end);
    size_t size = file.tellg();
    file.seekg(0);
    
    string content(size, '\0');
    file.read(&content[0], size);
    file.close();
    
    // Convert UTF-8 to wstring
    wstring_convert<codecvt_utf8<wchar_t>> converter;
    try {
        return converter.from_bytes(content);
    } catch (...) {
        return L"Error reading file content";
    }
}

vector<unsigned char> Lockstitch::loadFile(ifstream& file)
{
    file.unsetf(ios::skipws);

    streampos file_size;
    file.seekg(0, ios::end);
    file_size = file.tellg();
    file.seekg(0, ios::beg);

    vector<unsigned char> vec;
    vec.reserve(file_size);
    vec.insert(vec.begin(),
        istream_iterator<unsigned char>(file),
        istream_iterator<unsigned char>());

    file.close();

    return vec;
}

// File encryption methods - Mac compatible
string Lockstitch::encryptFile(string filename, string pw, int headSize)
{
    wstring wfilename = string_to_wstring(filename);
    wstring wpw = string_to_wstring(pw);
    wstring retVal = encryptFile(wfilename, wpw, headSize);
    if (retVal == ERROR_FILE_IO_FAILURE_CN)
        return ERROR_FILE_IO_FAILURE;

    string retFile(retVal.begin(), retVal.end());
    
    return std::move(retFile);
}

wstring Lockstitch::encryptFile(wstring filename, wstring pw, int headSize)
{
    // Convert wstring to string for Mac file operations
    string utf8_filename = wstring_to_string(filename);
    ifstream file(utf8_filename, std::ios::binary);
    if (file.fail())
        return ERROR_FILE_IO_FAILURE_CN;

    vector<unsigned char> vec = loadFile(file);
    int indx = filename.find_last_of('.');
    if (indx == string::npos)
        indx = filename.length();

    wstring extension = filename.substr(indx + 1);
    string ext(extension.begin(), extension.end());
    string startLocation = encryptData(vec, ext, headSize);
    
    // Convert extension to UTF-8 for cross-platform storage (16 bytes)
    string ext_utf8 = wstring_to_string(extension);
    while (ext_utf8.length() < 16)
        ext_utf8 += ' ';
    ext_utf8 = ext_utf8.substr(0, 16);
    string extension_encrypted = xorString(prefixData, (char*)ext_utf8.c_str(), 16);
    if (pw.length() < 16)
        pw.resize(16, ' ');

    
    // Convert password to UTF-8 for cross-platform storage (32 bytes)
    string pw_utf8 = wstring_to_string(pw);
    cout << "DEBUG encrypt: input password wstring length=" << pw.length() << endl;
    cout << "DEBUG encrypt: pw_utf8 before padding='" << pw_utf8 << "' (len=" << pw_utf8.length() << ")" << endl;
    
    // Print password bytes before padding
    cout << "DEBUG encrypt: pw_utf8 bytes before padding (hex): ";
    for (size_t i = 0; i < pw_utf8.length(); i++) {
        cout << std::hex << (int)(unsigned char)pw_utf8[i] << " ";
    }
    cout << std::dec << endl;
    
    if (pw_utf8.length() < 32)
        pw_utf8.resize(32, ' ');
    pw_utf8 = pw_utf8.substr(0, 32);
    cout << "DEBUG encrypt: pw_utf8 after padding (len=" << pw_utf8.length() << ")" << endl;
    
    // Print password bytes after padding
    cout << "DEBUG encrypt: pw_utf8 bytes after padding (hex): ";
    for (size_t i = 0; i < pw_utf8.length(); i++) {
        cout << std::hex << (int)(unsigned char)pw_utf8[i] << " ";
    }
    cout << std::dec << endl;
    cout.flush();
    
    string password_encrypted = xorString(prefixData, (char*)pw_utf8.c_str(), 32);
    
    // Print encrypted password bytes
    cout << "DEBUG encrypt: password_encrypted bytes (hex): ";
    for (size_t i = 0; i < password_encrypted.length(); i++) {
        cout << std::hex << (int)(unsigned char)password_encrypted[i] << " ";
    }
    cout << std::dec << endl;
    cout.flush();

    filename = filename.substr(0, indx) + L".claudo";
    string output_filename = wstring_to_string(filename);
    ofstream fs(output_filename, ios::out | ios::binary | ios::trunc);
    fs.write((char*)vec.data(), vec.size());
    fs.write(startLocation.c_str(), startLocation.length());
    fs.write(extension_encrypted.c_str(), 16);
    fs.write(password_encrypted.c_str(), 32);
    fs.close();

    return filename;
}

string Lockstitch::decryptFile(string filename, string pw)
{
    wstring wfilename = string_to_wstring(filename);
    wstring wpw = string_to_wstring(pw);
    wstring retVal = decryptFile(wfilename, wpw);
    if (retVal == ERROR_FILE_IO_FAILURE_CN)
        return ERROR_FILE_IO_FAILURE;

    if (retVal == ERROR_PW_NOT_MATCH_CN)
        return ERROR_PW_NOT_MATCH;

    if (retVal == ERROR_DECRYPT_FAIL_CN)
        return ERROR_DECRYPT_FAIL;

    if (retVal == ERROR_FILE_IO_FAILURE_CN)
        return ERROR_FILE_IO_FAILURE;

    string retFile(retVal.begin(), retVal.end());

    return std::move(retFile);
}

wstring Lockstitch::decryptFile(wstring filename, wstring pw)
{
    cout << "DEBUG: decryptFile called" << endl;
    cout.flush();
    try {
        string utf8_filename = wstring_to_string(filename);
        ifstream file(utf8_filename, ios::binary);
        if (file.fail())
            return ERROR_FILE_IO_FAILURE_CN;

        vector<unsigned char> content = loadFile(file);
        cout << "DEBUG: File loaded, size=" << content.size() << endl;
        cout.flush();
        
        if (content.size() < 48) {
            cout << "DEBUG: File too small (need at least 48 bytes for password+extension)" << endl;
            cout.flush();
            return ERROR_DECRYPT_FAIL_CN;
        }
        
        char arr[32];
        cout << "DEBUG: About to copy last 32 bytes for password" << endl;
        cout.flush();
        copy(content.end() - 32, content.end(), arr);
        content.erase(content.end() - 32, content.end());
        
        cout << "DEBUG: About to xorString for password" << endl;
        cout.flush();
        // Read password as UTF-8 bytes (32 bytes)
        string password_utf8 = xorString(prefixData, arr, 32);
        cout << "DEBUG: xorString done, password_utf8.length()=" << password_utf8.length() << endl;
        cout.flush();
        
        // Print password bytes safely
        cout << "DEBUG: password_utf8 bytes (hex): ";
        for (size_t i = 0; i < password_utf8.length() && i < 32; i++) {
            cout << std::hex << (int)(unsigned char)password_utf8[i] << " ";
        }
        cout << std::dec << endl;
        cout.flush();
        
        cout << "DEBUG: About to convert password to wstring" << endl;
        cout.flush();
        wstring password = string_to_wstring(password_utf8);
        
        cout << "DEBUG decrypt: stored password_utf8='" << password_utf8 << "' (len=" << password_utf8.length() << ")" << endl;
        cout << "DEBUG decrypt: input pw wstring length=" << pw.length() << endl;
        cout.flush();
        
        // Trim trailing spaces from stored password
        size_t end = password.find_last_not_of(L' ');
        if (end != wstring::npos)
            password = password.substr(0, end + 1);
        
        // Trim trailing spaces from input password
        wstring pw_trimmed = pw;
        end = pw_trimmed.find_last_not_of(L' ');
        if (end != wstring::npos)
            pw_trimmed = pw_trimmed.substr(0, end + 1);
        
        cout << "DEBUG decrypt: trimmed stored password length=" << password.length() << endl;
        cout << "DEBUG decrypt: trimmed input password length=" << pw_trimmed.length() << endl;
        cout.flush();
        
        if (password != pw_trimmed) {
            cout << "DEBUG decrypt: Password mismatch!" << endl;
            cout.flush();
            return ERROR_PW_NOT_MATCH_CN;
        }

        cout << "DEBUG decrypt: Password matched!" << endl;
        cout.flush();

        copy(content.end() - 16, content.end(), arr);
        content.erase(content.end() - 16, content.end());
        
        // Read extension as UTF-8 bytes (16 bytes)
        string extension_utf8 = xorString(prefixData, arr, 16);
        
        // Trim trailing spaces
        size_t ext_end = extension_utf8.find_last_not_of(' ');
        if (ext_end != string::npos)
            extension_utf8 = extension_utf8.substr(0, ext_end + 1);
        
        cout << "File extension: '" << extension_utf8 << "'" << endl;
        cout << "DEBUG: About to call decryptData" << endl;
        cout.flush();
        
        if (decryptData(content, extension_utf8) == 1) {
            cout << "DEBUG: decryptData returned 1 (failure)" << endl;
            cout.flush();
            return ERROR_DECRYPT_FAIL_CN;
        }
        
        cout << "DEBUG: decryptData succeeded" << endl;
        cout.flush();

        int lastDot = filename.rfind('.');
        if (lastDot == string::npos)
            lastDot = filename.length();

        wstring outFilePath = filename.substr(0, lastDot) + L'.' + string_to_wstring(extension_utf8);
        string utf8_output = wstring_to_string(outFilePath);

        ofstream fs(utf8_output, ios::out | ios::binary | ios::trunc);
        fs.write((char*)content.data(), content.size());
        fs.close();

        return outFilePath;
    }
    catch (const ios_base::failure& e) {
        return ERROR_FILE_IO_FAILURE_CN;
    }
    catch (const exception& e) {
        return ERROR_DECRYPT_FAIL_CN;
    }

    return ERROR_DECRYPT_FAIL_CN;
}

int Lockstitch::decryptData(vector<unsigned char>& data, string fielExtion)
{
    char preChars[8];

    int len = getPreNumBufSize();
    copy(data.end() - len, data.end(), preChars);
    data.erase(data.end() - len, data.end());
    int n = data.size() - 1;
    int headSize = (data[n-1]<<8) + data[n]; 
    data.erase(data.end()-2, data.end());
    if (headSize > (data.size() >> 1)) {
        cout << "Error. Invalid file loaded.  program terminated.";
        return 1;
    }

    if(headSize > 0)
        data.erase(data.begin(), data.begin() + headSize);
        
    string str1 = xorString(prefixData, preChars, len);
    int number = atoi(str1.c_str());
    cout << "DEBUG decryptData: number=" << number << ", constantString.length()=" << m_constantString.length() << ", str1='" << str1 << "'" << endl;
    if (number == 0|| number + 10 > m_constantString.length()) {
        cout << "Error. Invalid file loaded.  program terminated.";
        return 1;
    }
    
    string str2 = m_constantString.substr(number);
    size_t size = min((size_t)1000, str2.length());
    str2 = str2.substr(0, size);
    toUpper(fielExtion);
    if (fielExtion =="MP4" || fielExtion == "MOV")
    {
        xorString(data, str2);
    }
    else {
        n = n - 2 - headSize;
        size_t data1_Size = (data[n - 3] << 24) + (data[n - 2] << 16) + (data[n - 1] << 8) + data[n];
        data.erase(data.end() - 4, data.end());
        vector<unsigned char> data1;
        data1.insert(data1.end(), data.begin(), data.begin() + data1_Size);
        data.erase(data.begin(), data.begin() + data1_Size);

        data1 = divString(data1, str2);
        xorString(data, str2);
        data.insert(data.begin(), data1.begin(), data1.end());
    }

    return 0;
}

string Lockstitch::encryptData(vector<unsigned char>& data, string fielExtion, int headSize)
{
    unsigned char* header = NULL;
    if (headSize) {
        headSize = min((size_t)headSize, data.size());
        header = new unsigned char[headSize];
        copy(data.begin(), data.begin() + headSize, header);
    }

    int number = getEncodePaterStartPos();
    string str1 = to_string(number);
    int bufSize = getPreNumBufSize();
    int dif = bufSize - str1.length();
    while (dif-- > 0)
        str1 = "0" + str1;

    string str2 = m_constantString.substr(number);
    size_t size = min((size_t)1000, str2.length());
    str2 = str2.substr(0, size);

    toUpper(fielExtion);
    if (fielExtion == "MP4" || fielExtion == "MOV")
    {
        xorString(data, str2);
    }
    else {
        size_t vsize = min(data.size(), (size_t)MUL_DIV_DATA_SIZE);
        vector<unsigned char> data1;
        data1.insert(data1.end(), data.begin(), data.begin() + vsize);
        data.erase(data.begin(), data.begin() + vsize);

        data1 = mulString(data1, str2);
        data1 = charListToHexCharArray(data1);
        xorString(data, str2);
        data.insert(data.begin(), data1.begin(), data1.end());

        vsize = data1.size();
        data.push_back((vsize & 0xFF000000) >> 24);
        data.push_back((vsize & 0x00FF0000) >> 16);
        data.push_back((vsize & 0x0000FF00) >> 8);
        data.push_back(vsize & 0x000000FF);
    }

    data.push_back((headSize & 0xFF00) >> 8);
    data.push_back(headSize & 0x00FF);

    if (headSize) {
        for (int i = headSize - 1; i >= 0; --i)
            data.insert(data.begin(), header[i]);

        delete[]header;
    }

    return xorString(prefixData, str1, bufSize);
}

void Lockstitch::toUpper(string& s)
{
    transform(s.begin(), s.end(), s.begin(),
        [](unsigned char c) { return std::toupper(c); });
}

int Lockstitch::getEncodePaterStartPos()
{
    time_t seconds = time(NULL);
    srand(seconds);
    int len = m_constantString.length();
    int number = 0;
    while (number == 0)
        number = rand() % (len - 10);

    return number;
}
