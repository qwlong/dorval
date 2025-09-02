// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'find_pets_by_status_params.f.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

FindPetsByStatusParams _$FindPetsByStatusParamsFromJson(
    Map<String, dynamic> json) {
  return _FindPetsByStatusParams.fromJson(json);
}

/// @nodoc
mixin _$FindPetsByStatusParams {
  /// Status values that need to be considered for filter
  List<String> get status => throw _privateConstructorUsedError;

  /// Serializes this FindPetsByStatusParams to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of FindPetsByStatusParams
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $FindPetsByStatusParamsCopyWith<FindPetsByStatusParams> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $FindPetsByStatusParamsCopyWith<$Res> {
  factory $FindPetsByStatusParamsCopyWith(FindPetsByStatusParams value,
          $Res Function(FindPetsByStatusParams) then) =
      _$FindPetsByStatusParamsCopyWithImpl<$Res, FindPetsByStatusParams>;
  @useResult
  $Res call({List<String> status});
}

/// @nodoc
class _$FindPetsByStatusParamsCopyWithImpl<$Res,
        $Val extends FindPetsByStatusParams>
    implements $FindPetsByStatusParamsCopyWith<$Res> {
  _$FindPetsByStatusParamsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of FindPetsByStatusParams
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
  }) {
    return _then(_value.copyWith(
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$FindPetsByStatusParamsImplCopyWith<$Res>
    implements $FindPetsByStatusParamsCopyWith<$Res> {
  factory _$$FindPetsByStatusParamsImplCopyWith(
          _$FindPetsByStatusParamsImpl value,
          $Res Function(_$FindPetsByStatusParamsImpl) then) =
      __$$FindPetsByStatusParamsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({List<String> status});
}

/// @nodoc
class __$$FindPetsByStatusParamsImplCopyWithImpl<$Res>
    extends _$FindPetsByStatusParamsCopyWithImpl<$Res,
        _$FindPetsByStatusParamsImpl>
    implements _$$FindPetsByStatusParamsImplCopyWith<$Res> {
  __$$FindPetsByStatusParamsImplCopyWithImpl(
      _$FindPetsByStatusParamsImpl _value,
      $Res Function(_$FindPetsByStatusParamsImpl) _then)
      : super(_value, _then);

  /// Create a copy of FindPetsByStatusParams
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
  }) {
    return _then(_$FindPetsByStatusParamsImpl(
      status: null == status
          ? _value._status
          : status // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$FindPetsByStatusParamsImpl implements _FindPetsByStatusParams {
  const _$FindPetsByStatusParamsImpl({required final List<String> status})
      : _status = status;

  factory _$FindPetsByStatusParamsImpl.fromJson(Map<String, dynamic> json) =>
      _$$FindPetsByStatusParamsImplFromJson(json);

  /// Status values that need to be considered for filter
  final List<String> _status;

  /// Status values that need to be considered for filter
  @override
  List<String> get status {
    if (_status is EqualUnmodifiableListView) return _status;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_status);
  }

  @override
  String toString() {
    return 'FindPetsByStatusParams(status: $status)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$FindPetsByStatusParamsImpl &&
            const DeepCollectionEquality().equals(other._status, _status));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, const DeepCollectionEquality().hash(_status));

  /// Create a copy of FindPetsByStatusParams
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$FindPetsByStatusParamsImplCopyWith<_$FindPetsByStatusParamsImpl>
      get copyWith => __$$FindPetsByStatusParamsImplCopyWithImpl<
          _$FindPetsByStatusParamsImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$FindPetsByStatusParamsImplToJson(
      this,
    );
  }
}

abstract class _FindPetsByStatusParams implements FindPetsByStatusParams {
  const factory _FindPetsByStatusParams({required final List<String> status}) =
      _$FindPetsByStatusParamsImpl;

  factory _FindPetsByStatusParams.fromJson(Map<String, dynamic> json) =
      _$FindPetsByStatusParamsImpl.fromJson;

  /// Status values that need to be considered for filter
  @override
  List<String> get status;

  /// Create a copy of FindPetsByStatusParams
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$FindPetsByStatusParamsImplCopyWith<_$FindPetsByStatusParamsImpl>
      get copyWith => throw _privateConstructorUsedError;
}
