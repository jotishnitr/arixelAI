const tokenChecker = (model_name, userCurrentTokens, requriedTokensCount) => {
    let model_match = userCurrentTokens.find((model) => model.model === model_name)

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
