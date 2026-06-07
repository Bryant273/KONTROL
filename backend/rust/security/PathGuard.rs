// Rust Path Guard: Enterprise Path Normalization & Access Control
pub fn is_path_secure(path: &str, has_hardened_token: bool) -> bool {
    // 1. Lowercase for uniform analysis
    let normalized = path.to_lowercase();

    // 2. Mitigate Null Byte Injection (%00)
    if normalized.contains('\0') || normalized.contains("%00") {
        return false;
    }

    // 3. Mitigate Directory Traversal attacks (../, %2e%2e%2f, escaped slashes)
    if normalized.contains("../") 
        || normalized.contains("..\\") 
        || normalized.contains("%2e%2e") 
        || normalized.contains("..") 
    {
        return false;
    }

    // 4. Enforce strict token checks on restricted administrative resource scopes
    if normalized.contains("/admin") || normalized.contains("/control-tower") {
        return has_hardened_token;
    }

    true
}
