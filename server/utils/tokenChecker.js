const tokenChecker = (model_name, userCurrentTokens, requriedTokensCount) => {
    let model_match = userCurrentTokens.find((model) => model.model === model_name);

    // If exact match not found, match by normalized name (stripping provider prefixes or :free suffixes)
    if (!model_match) {
        const normalize = (name) => String(name || "").toLowerCase().replace(/^[^/]+\//, "").replace(/:free$/, "").replace(/[^a-z0-9]/g, "");
        const targetNormalized = normalize(model_name);
        model_match = userCurrentTokens.find((model) => {
            const mNorm = normalize(model.model);
            return mNorm === targetNormalized || mNorm.includes(targetNormalized) || targetNormalized.includes(mNorm);
        });
    }

    if (model_match) {
        const remaining = model_match.providerRemainingTokens !== undefined
            ? model_match.providerRemainingTokens
            : (model_match.dailyTokenCapacity || 0) - (model_match.dailyTokensUsed || 0);

        if (remaining >= requriedTokensCount) {
            return { model: model_match, has_sufficient_tokens: true };
        }
    }
    return { model: null, has_sufficient_tokens: false };
}

module.exports = tokenChecker
