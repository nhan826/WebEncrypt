#include <napi.h>
#include "cpp/Lockstitch.h"
#include <string>
#include <fstream>
#include <iostream>

// String Encryption
Napi::String EncryptString(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return Napi::String::New(env, "");
    }
    
    std::string input = info[0].As<Napi::String>().Utf8Value();
    Lockstitch& lock = Lockstitch::getLockstitch();
    std::string encrypted = lock.encrypt(input);
    
    return Napi::String::New(env, encrypted);
}

// String Decryption
Napi::String DecryptString(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return Napi::String::New(env, "");
    }
    
    std::string input = info[0].As<Napi::String>().Utf8Value();
    Lockstitch& lock = Lockstitch::getLockstitch();
    std::string decrypted = lock.decrypt(input);
    
    return Napi::String::New(env, decrypted);
}

// File Encryption
Napi::String EncryptFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "String arguments expected").ThrowAsJavaScriptException();
        return Napi::String::New(env, "");
    }
    
    std::string filePath = info[0].As<Napi::String>().Utf8Value();
    std::string password = info[1].As<Napi::String>().Utf8Value();
    int headSize = info.Length() > 2 ? info[2].As<Napi::Number>().Int32Value() : 0;
    
    Lockstitch& lock = Lockstitch::getLockstitch();
    std::string result = lock.encryptFile(filePath, password, headSize);
    
    return Napi::String::New(env, result);
}

// File Decryption
Napi::String DecryptFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "String arguments expected").ThrowAsJavaScriptException();
        return Napi::String::New(env, "");
    }
    
    std::string filePath = info[0].As<Napi::String>().Utf8Value();
    std::string password = info[1].As<Napi::String>().Utf8Value();
    
    Lockstitch& lock = Lockstitch::getLockstitch();
    std::string result = lock.decryptFile(filePath, password);
    
    return Napi::String::New(env, result);
}

// Initialize the addon
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("encryptString", Napi::Function::New(env, EncryptString));
    exports.Set("decryptString", Napi::Function::New(env, DecryptString));
    exports.Set("encryptFile", Napi::Function::New(env, EncryptFile));
    exports.Set("decryptFile", Napi::Function::New(env, DecryptFile));
    return exports;
}

NODE_API_MODULE(lockstitch, Init)
