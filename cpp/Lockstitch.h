#pragma once
#include <vector>
//#include <atlstr.h>
#include<string>
using namespace std;
#define ERROR_PW_NOT_MATCH "Password incorrect"
#define ERROR_PW_NOT_MATCH_CN L"密码验证失败"
#define ERROR_DECRYPT_FAIL "Decrypting failed. Is the file actually encrypted?"
#define ERROR_DECRYPT_FAIL_CN L"解密失败。请确认你要解密得文件是否已经加密过了"
#define ERROR_FILE_IO_FAILURE "File I/O failure.  Please double check the wether the file exists or not"
#define ERROR_FILE_IO_FAILURE_CN L"文件读写失败。请确认该文档是否存在"
class Lockstitch
{
	Lockstitch();
	// Private destructor to prevent external deletion
	~Lockstitch() {
		delete instance;
	}

	// Private static instance variable
	static Lockstitch* instance;
	const char* const prefixData = "@muirp}x";
	const wchar_t* const prefixData_t = L"@muirp}x";
	char* password = nullptr;
	char* password_t = nullptr;
	string m_constantString;
	int getPreNumBufSize();
	string xorString(const char* const str1, const char* const str2, int len)const;
	wstring xorString(const wchar_t* const str1, const wchar_t* const str2, int len)const;
	string xorString(const char* const str1, string& str2, int len)const;
	wstring xorString(const wchar_t* const str1, wstring& str2, int len)const;
	void xorString(vector<unsigned char>& str1, const string str2);
	vector<unsigned char> mulString(vector<unsigned char>& vec, string str);
	vector<unsigned char> divString(string& str1, string str2);
	vector<unsigned char> divString(vector<unsigned char>& str1, string str2);

	vector<unsigned char> stringToCharList(string& cstrw);
	vector<unsigned char> wstringToCharList(wstring& cstrw);
	string charListToString(vector<unsigned char>&);
	wstring charListToWString(vector<unsigned char>&);
	string charListToHexString(vector<unsigned char>&);
	vector<unsigned char> charListToHexCharArray(vector<unsigned char>& arr);
	vector<unsigned char> loadFile(ifstream& file);
	int decryptData(vector<unsigned char>&, string fielExtion);
	string encryptData(vector<unsigned char>& data, string fielExtion = "", int headSize = 0);
	void toUpper(string& s);
	int getEncodePaterStartPos();

public:
	Lockstitch(const Lockstitch&) = delete;
	Lockstitch& operator=(const Lockstitch&) = delete;
	static Lockstitch& getLockstitch()
	{
		if (!instance) {
			instance = new Lockstitch();
		}
		return *instance;
	}

	string encrypt(string& str);
	wstring encrypt(wstring& wstr);
	string decrypt(string& str);
	wstring decrypt(wstring& wstr);
	string encryptFile(string fileName, string pw = "", int headSize = 0);
	wstring encryptFile(wstring fileName, wstring pw = L"", int headSize = 0);
	string decryptFile(string fileName, string pw ="");
	wstring decryptFile(wstring fileName, wstring pw = L"");
	string loadTxtFile(string filename);
	wstring loadTxtFile(wstring filename);
};

