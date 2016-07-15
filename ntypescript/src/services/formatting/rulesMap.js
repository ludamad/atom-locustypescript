///<reference path='references.ts' />
/* @internal */
var ts;
(function (ts) {
    var formatting;
    (function (formatting) {
        var RulesMap = (function () {
            function RulesMap() {
                this.map = [];
                this.mapRowLength = 0;
            }
            RulesMap.create = function (rules) {
                var result = new RulesMap();
                result.Initialize(rules);
                return result;
            };
            RulesMap.prototype.Initialize = function (rules) {
                this.mapRowLength = ts.SyntaxKind.LastToken + 1;
                this.map = new Array(this.mapRowLength * this.mapRowLength); //new Array<RulesBucket>(this.mapRowLength * this.mapRowLength);
                // This array is used only during construction of the rulesbucket in the map
                var rulesBucketConstructionStateList = new Array(this.map.length); //new Array<RulesBucketConstructionState>(this.map.length);
                this.FillRules(rules, rulesBucketConstructionStateList);
                return this.map;
            };
            RulesMap.prototype.FillRules = function (rules, rulesBucketConstructionStateList) {
                var _this = this;
                rules.forEach(function (rule) {
                    _this.FillRule(rule, rulesBucketConstructionStateList);
                });
            };
            RulesMap.prototype.GetRuleBucketIndex = function (row, column) {
                var rulesBucketIndex = (row * this.mapRowLength) + column;
                //Debug.Assert(rulesBucketIndex < this.map.Length, "Trying to access an index outside the array.");
                return rulesBucketIndex;
            };
            RulesMap.prototype.FillRule = function (rule, rulesBucketConstructionStateList) {
                var _this = this;
                var specificRule = rule.Descriptor.LeftTokenRange !== formatting.Shared.TokenRange.Any &&
                    rule.Descriptor.RightTokenRange !== formatting.Shared.TokenRange.Any;
                rule.Descriptor.LeftTokenRange.GetTokens().forEach(function (left) {
                    rule.Descriptor.RightTokenRange.GetTokens().forEach(function (right) {
                        var rulesBucketIndex = _this.GetRuleBucketIndex(left, right);
                        var rulesBucket = _this.map[rulesBucketIndex];
                        if (rulesBucket === undefined) {
                            rulesBucket = _this.map[rulesBucketIndex] = new RulesBucket();
                        }
                        rulesBucket.AddRule(rule, specificRule, rulesBucketConstructionStateList, rulesBucketIndex);
                    });
                });
            };
            RulesMap.prototype.GetRule = function (context) {
                var bucketIndex = this.GetRuleBucketIndex(context.currentTokenSpan.kind, context.nextTokenSpan.kind);
                var bucket = this.map[bucketIndex];
                if (bucket != null) {
                    for (var _i = 0, _a = bucket.Rules(); _i < _a.length; _i++) {
                        var rule = _a[_i];
                        if (rule.Operation.Context.InContext(context)) {
                            return rule;
                        }
                    }
                }
                return null;
            };
            return RulesMap;
        })();
        formatting.RulesMap = RulesMap;
        var MaskBitSize = 5;
        var Mask = 0x1f;
        (function (RulesPosition) {
            RulesPosition[RulesPosition["IgnoreRulesSpecific"] = 0] = "IgnoreRulesSpecific";
            RulesPosition[RulesPosition["IgnoreRulesAny"] = MaskBitSize * 1] = "IgnoreRulesAny";
            RulesPosition[RulesPosition["ContextRulesSpecific"] = MaskBitSize * 2] = "ContextRulesSpecific";
            RulesPosition[RulesPosition["ContextRulesAny"] = MaskBitSize * 3] = "ContextRulesAny";
            RulesPosition[RulesPosition["NoContextRulesSpecific"] = MaskBitSize * 4] = "NoContextRulesSpecific";
            RulesPosition[RulesPosition["NoContextRulesAny"] = MaskBitSize * 5] = "NoContextRulesAny";
        })(formatting.RulesPosition || (formatting.RulesPosition = {}));
        var RulesPosition = formatting.RulesPosition;
        var RulesBucketConstructionState = (function () {
            function RulesBucketConstructionState() {
                //// The Rules list contains all the inserted rules into a rulebucket in the following order:
                ////    1- Ignore rules with specific token combination
                ////    2- Ignore rules with any token combination
                ////    3- Context rules with specific token combination
                ////    4- Context rules with any token combination
                ////    5- Non-context rules with specific token combination
                ////    6- Non-context rules with any token combination
                //// 
                //// The member rulesInsertionIndexBitmap is used to describe the number of rules
                //// in each sub-bucket (above) hence can be used to know the index of where to insert 
                //// the next rule. It's a bitmap which contains 6 different sections each is given 5 bits.
                ////
                //// Example:
                //// In order to insert a rule to the end of sub-bucket (3), we get the index by adding
                //// the values in the bitmap segments 3rd, 2nd, and 1st.
                this.rulesInsertionIndexBitmap = 0;
            }
            RulesBucketConstructionState.prototype.GetInsertionIndex = function (maskPosition) {
                var index = 0;
                var pos = 0;
                var indexBitmap = this.rulesInsertionIndexBitmap;
                while (pos <= maskPosition) {
                    index += (indexBitmap & Mask);
                    indexBitmap >>= MaskBitSize;
                    pos += MaskBitSize;
                }
                return index;
            };
            RulesBucketConstructionState.prototype.IncreaseInsertionIndex = function (maskPosition) {
                var value = (this.rulesInsertionIndexBitmap >> maskPosition) & Mask;
                value++;
                ts.Debug.assert((value & Mask) === value, "Adding more rules into the sub-bucket than allowed. Maximum allowed is 32 rules.");
                var temp = this.rulesInsertionIndexBitmap & ~(Mask << maskPosition);
                temp |= value << maskPosition;
                this.rulesInsertionIndexBitmap = temp;
            };
            return RulesBucketConstructionState;
        })();
        formatting.RulesBucketConstructionState = RulesBucketConstructionState;
        var RulesBucket = (function () {
            function RulesBucket() {
                this.rules = [];
            }
            RulesBucket.prototype.Rules = function () {
                return this.rules;
            };
            RulesBucket.prototype.AddRule = function (rule, specificTokens, constructionState, rulesBucketIndex) {
                var position;
                if (rule.Operation.Action === formatting.RuleAction.Ignore) {
                    position = specificTokens ?
                        RulesPosition.IgnoreRulesSpecific :
                        RulesPosition.IgnoreRulesAny;
                }
                else if (!rule.Operation.Context.IsAny()) {
                    position = specificTokens ?
                        RulesPosition.ContextRulesSpecific :
                        RulesPosition.ContextRulesAny;
                }
                else {
                    position = specificTokens ?
                        RulesPosition.NoContextRulesSpecific :
                        RulesPosition.NoContextRulesAny;
                }
                var state = constructionState[rulesBucketIndex];
                if (state === undefined) {
                    state = constructionState[rulesBucketIndex] = new RulesBucketConstructionState();
                }
                var index = state.GetInsertionIndex(position);
                this.rules.splice(index, 0, rule);
                state.IncreaseInsertionIndex(position);
            };
            return RulesBucket;
        })();
        formatting.RulesBucket = RulesBucket;
    })(formatting = ts.formatting || (ts.formatting = {}));
})(ts || (ts = {}));
//# sourceMappingURL=rulesMap.js.map