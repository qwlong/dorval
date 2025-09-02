// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'list_pets_params.f.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

ListPetsParams _$ListPetsParamsFromJson(Map<String, dynamic> json) {
  return _ListPetsParams.fromJson(json);
}

/// @nodoc
mixin _$ListPetsParams {
  /// How many items to return at one time (max 100)
  int? get limit => throw _privateConstructorUsedError;

  /// The offset for pagination
  int? get offset => throw _privateConstructorUsedError;

  /// Serializes this ListPetsParams to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ListPetsParams
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ListPetsParamsCopyWith<ListPetsParams> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ListPetsParamsCopyWith<$Res> {
  factory $ListPetsParamsCopyWith(
          ListPetsParams value, $Res Function(ListPetsParams) then) =
      _$ListPetsParamsCopyWithImpl<$Res, ListPetsParams>;
  @useResult
  $Res call({int? limit, int? offset});
}

/// @nodoc
class _$ListPetsParamsCopyWithImpl<$Res, $Val extends ListPetsParams>
    implements $ListPetsParamsCopyWith<$Res> {
  _$ListPetsParamsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ListPetsParams
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? limit = freezed,
    Object? offset = freezed,
  }) {
    return _then(_value.copyWith(
      limit: freezed == limit
          ? _value.limit
          : limit // ignore: cast_nullable_to_non_nullable
              as int?,
      offset: freezed == offset
          ? _value.offset
          : offset // ignore: cast_nullable_to_non_nullable
              as int?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ListPetsParamsImplCopyWith<$Res>
    implements $ListPetsParamsCopyWith<$Res> {
  factory _$$ListPetsParamsImplCopyWith(_$ListPetsParamsImpl value,
          $Res Function(_$ListPetsParamsImpl) then) =
      __$$ListPetsParamsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({int? limit, int? offset});
}

/// @nodoc
class __$$ListPetsParamsImplCopyWithImpl<$Res>
    extends _$ListPetsParamsCopyWithImpl<$Res, _$ListPetsParamsImpl>
    implements _$$ListPetsParamsImplCopyWith<$Res> {
  __$$ListPetsParamsImplCopyWithImpl(
      _$ListPetsParamsImpl _value, $Res Function(_$ListPetsParamsImpl) _then)
      : super(_value, _then);

  /// Create a copy of ListPetsParams
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? limit = freezed,
    Object? offset = freezed,
  }) {
    return _then(_$ListPetsParamsImpl(
      limit: freezed == limit
          ? _value.limit
          : limit // ignore: cast_nullable_to_non_nullable
              as int?,
      offset: freezed == offset
          ? _value.offset
          : offset // ignore: cast_nullable_to_non_nullable
              as int?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ListPetsParamsImpl implements _ListPetsParams {
  const _$ListPetsParamsImpl({this.limit, this.offset});

  factory _$ListPetsParamsImpl.fromJson(Map<String, dynamic> json) =>
      _$$ListPetsParamsImplFromJson(json);

  /// How many items to return at one time (max 100)
  @override
  final int? limit;

  /// The offset for pagination
  @override
  final int? offset;

  @override
  String toString() {
    return 'ListPetsParams(limit: $limit, offset: $offset)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ListPetsParamsImpl &&
            (identical(other.limit, limit) || other.limit == limit) &&
            (identical(other.offset, offset) || other.offset == offset));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, limit, offset);

  /// Create a copy of ListPetsParams
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ListPetsParamsImplCopyWith<_$ListPetsParamsImpl> get copyWith =>
      __$$ListPetsParamsImplCopyWithImpl<_$ListPetsParamsImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ListPetsParamsImplToJson(
      this,
    );
  }
}

abstract class _ListPetsParams implements ListPetsParams {
  const factory _ListPetsParams({final int? limit, final int? offset}) =
      _$ListPetsParamsImpl;

  factory _ListPetsParams.fromJson(Map<String, dynamic> json) =
      _$ListPetsParamsImpl.fromJson;

  /// How many items to return at one time (max 100)
  @override
  int? get limit;

  /// The offset for pagination
  @override
  int? get offset;

  /// Create a copy of ListPetsParams
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ListPetsParamsImplCopyWith<_$ListPetsParamsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
